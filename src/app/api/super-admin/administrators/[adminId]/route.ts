import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { assertSameOrigin } from "@/features/profile/security";
import { requireRecentAdminElevation } from "@/features/admin-security/elevation";
const schema=z.object({action:z.enum(["SUSPEND","RESTORE","REVOKE_SESSIONS"]),reason:z.string().trim().min(5).max(300)}).strict();
export async function PATCH(request:Request,{params}:{params:Promise<{adminId:string}>}){
  try{assertSameOrigin(request);const auth=await requireSuperAdmin();await requireRecentAdminElevation({userId:auth.userId,scopeType:"SUPER_ADMIN"});const{adminId}=await params,input=schema.parse(await request.json()),memberships=await prisma.miniAppMembership.findMany({where:{userId:adminId,role:"ADMIN"}});
    if(!memberships.length)return Response.json({error:"Administrator not found.",code:"ADMIN_NOT_FOUND"},{status:404});
    const ids=memberships.map(m=>m.id),status=input.action==="SUSPEND"?"SUSPENDED":"ACTIVE";
    await prisma.$transaction([
      ...(input.action==="REVOKE_SESSIONS"?[]:[prisma.miniAppMembership.updateMany({where:{id:{in:ids}},data:{status}})]),
      prisma.appSession.updateMany({where:{userId:adminId,membershipId:{in:ids},revokedAt:null},data:{revokedAt:new Date()}}),
      ...memberships.map(m=>prisma.adminAuditLog.create({data:{miniAppId:m.miniAppId,actorUserId:auth.userId,action:input.action==="REVOKE_SESSIONS"?"ADMINISTRATOR_SESSIONS_REVOKED":`ADMINISTRATOR_${input.action}D`,targetType:"User",targetId:adminId,metadata:{reason:input.reason}}})),
    ]);return Response.json({ok:true,status:input.action==="REVOKE_SESSIONS"?undefined:status});
  }catch(error){return error instanceof Response?error:Response.json({error:"Could not update Administrator.",code:"INVALID_INPUT"},{status:422})}
}
