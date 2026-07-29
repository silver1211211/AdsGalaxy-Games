import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { assertSameOrigin, rateLimit } from "@/features/profile/security";
import { normalizeTenantSlug, validTenantSlug } from "@/features/super-admin/policy";

const schema=z.discriminatedUnion("action",[
  z.object({action:z.literal("EDIT"),name:z.string().trim().min(2).max(100),description:z.string().trim().max(500).nullable(),slug:z.string().trim().min(2).max(64)}).strict(),
  z.object({action:z.literal("INACTIVITY_EXEMPT"),reason:z.string().trim().min(5).max(300),expiresAt:z.string().datetime().nullable(),confirm:z.literal(true)}).strict(),
  z.object({action:z.enum(["SUSPEND","RESTORE","MAINTENANCE_ON","MAINTENANCE_OFF","ARCHIVE","RESET_BOT","RESET_OXAPAY","RESET_ADS_GALAXY"]),reason:z.string().trim().min(5).max(300),confirm:z.literal(true)}).strict(),
]);
function recent(createdAt:Date){if(Date.now()-createdAt.getTime()>30*60_000)throw Response.json({error:"Recent authentication is required.",code:"RECENT_AUTH_REQUIRED"},{status:403})}
export async function PATCH(request:Request,{params}:{params:Promise<{tenantId:string}>}){
  try{
    assertSameOrigin(request);const auth=await requireSuperAdmin();rateLimit(`sa-tenant:${auth.userId}`,12,60_000);
    const {tenantId}=await params,input=schema.parse(await request.json()),tenant=await prisma.miniApp.findUnique({where:{id:tenantId},include:{adminSettings:true}});
    if(!tenant)return Response.json({error:"Tenant not found.",code:"TENANT_NOT_FOUND"},{status:404});
    if(input.action!=="EDIT")recent(auth.appSession.createdAt);
    if(input.action==="EDIT"){
      const slug=normalizeTenantSlug(input.slug);if(!validTenantSlug(slug))return Response.json({error:"Invalid or reserved slug.",code:"INVALID_INPUT"},{status:422});
      await prisma.$transaction([
        prisma.miniApp.update({where:{id:tenantId},data:{name:input.name,slug}}),
        prisma.tenantAdminSettings.upsert({where:{miniAppId:tenantId},create:{miniAppId:tenantId,description:input.description},update:{description:input.description}}),
        prisma.adminAuditLog.create({data:{miniAppId:tenantId,actorUserId:auth.userId,action:slug!==tenant.slug?"TENANT_SLUG_CHANGED":"TENANT_EDITED",targetType:"MiniApp",targetId:tenantId,before:{name:tenant.name,slug:tenant.slug,description:tenant.adminSettings?.description},after:{name:input.name,slug,description:input.description}}}),
      ]);return Response.json({ok:true,slug});
    }
    const reason=input.reason;
    if(input.action==="INACTIVITY_EXEMPT"){
      await prisma.$transaction([
        prisma.miniApp.update({where:{id:tenantId},data:{inactivityExempt:true,inactivityExemptReason:reason,inactivityExemptUntil:input.expiresAt?new Date(input.expiresAt):null}}),
        prisma.adminAuditLog.create({data:{miniAppId:tenantId,actorUserId:auth.userId,action:"TENANT_INACTIVITY_EXEMPTED",targetType:"MiniApp",targetId:tenantId,after:{exempt:true,expiresAt:input.expiresAt},metadata:{reason}}}),
      ]);return Response.json({ok:true});
    }
    if(input.action==="SUSPEND"||input.action==="RESTORE"||input.action==="ARCHIVE"){
      const status=input.action==="SUSPEND"?"PAUSED":input.action==="RESTORE"?"ACTIVE":"ARCHIVED";
      await prisma.$transaction([
        prisma.miniApp.update({where:{id:tenantId},data:{status,...(input.action==="RESTORE"?{inactivityResumeAt:new Date(),inactivityReason:null}:{})}}),
        ...(input.action==="SUSPEND"?[prisma.appSession.updateMany({where:{miniAppId:tenantId,revokedAt:null},data:{revokedAt:new Date()}})]:[]),
        prisma.adminAuditLog.create({data:{miniAppId:tenantId,actorUserId:auth.userId,action:input.action==="RESTORE"&&tenant.inactivityReason==="INACTIVITY"?"TENANT_RESUMED_AFTER_INACTIVITY":`TENANT_${input.action}D`,targetType:"MiniApp",targetId:tenantId,before:{status:tenant.status},after:{status},metadata:{reason}}}),
      ]);return Response.json({ok:true,status});
    }
    if(input.action==="MAINTENANCE_ON"||input.action==="MAINTENANCE_OFF"){
      const enabled=input.action==="MAINTENANCE_ON";
      await prisma.$transaction([
        prisma.tenantAdminSettings.upsert({where:{miniAppId:tenantId},create:{miniAppId:tenantId,maintenanceMode:enabled},update:{maintenanceMode:enabled}}),
        prisma.adminAuditLog.create({data:{miniAppId:tenantId,actorUserId:auth.userId,action:enabled?"TENANT_MAINTENANCE_ENABLED":"TENANT_MAINTENANCE_DISABLED",targetType:"TenantAdminSettings",targetId:tenant.adminSettings?.id,metadata:{reason}}}),
      ]);return Response.json({ok:true,maintenanceMode:enabled});
    }
    if(input.action==="RESET_BOT"){
      await prisma.$transaction([prisma.tenantBotConfiguration.deleteMany({where:{miniAppId:tenantId}}),prisma.adminAuditLog.create({data:{miniAppId:tenantId,actorUserId:auth.userId,action:"TELEGRAM_BOT_TOKEN_RESET",targetType:"TenantBotConfiguration",targetId:tenantId,metadata:{reason}}})]);
    }else if(input.action==="RESET_OXAPAY"){
      const unresolved=await prisma.withdrawal.count({where:{miniAppId:tenantId,processingMode:"OXAPAY_AUTOMATIC",status:{in:["APPROVED","PROCESSING"]}}});
      if(unresolved)return Response.json({error:"Resolve automatic payouts before resetting OxaPay.",code:"CONFLICT"},{status:409});
      await prisma.$transaction([
        prisma.tenantOxaPayCredential.deleteMany({where:{miniAppId:tenantId}}),
        prisma.adminAuditLog.create({data:{miniAppId:tenantId,actorUserId:auth.userId,action:"OXAPAY_CREDENTIAL_RESET",targetType:"TenantOxaPayCredential",targetId:tenantId,metadata:{reason}}}),
      ]);
    }else{
      await prisma.$transaction([prisma.adsGalaxyConfiguration.updateMany({where:{miniAppId:tenantId},data:{miniAppPublicId:null,status:"NOT_CONFIGURED"}}),prisma.adminAuditLog.create({data:{miniAppId:tenantId,actorUserId:auth.userId,action:"ADS_GALAXY_ID_RESET",targetType:"AdsGalaxyConfiguration",targetId:tenantId,metadata:{reason}}})]);
    }
    return Response.json({ok:true});
  }catch(error){
    if(error instanceof Response)return error;
    if(error instanceof z.ZodError)return Response.json({error:"Invalid action.",code:"INVALID_INPUT"},{status:422});
    if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")return Response.json({error:"That slug already exists.",code:"CONFLICT"},{status:409});
    return Response.json({error:"Could not update tenant.",code:"INTERNAL_ERROR"},{status:500});
  }
}
