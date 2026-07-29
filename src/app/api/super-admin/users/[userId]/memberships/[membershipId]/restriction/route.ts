import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { assertSameOrigin } from "@/features/profile/security";
const schema=z.object({action:z.enum(["BAN","UNBAN"]),reason:z.string().trim().min(5).max(300)}).strict();
export async function POST(request:Request,{params}:{params:Promise<{userId:string;membershipId:string}>}){
  try{assertSameOrigin(request);const auth=await requireSuperAdmin(),{userId,membershipId}=await params,input=schema.parse(await request.json()),member=await prisma.miniAppMembership.findFirst({where:{id:membershipId,userId}});
    if(!member)return Response.json({error:"Membership not found.",code:"USER_NOT_FOUND"},{status:404});const ban=input.action==="BAN",now=new Date();
    await prisma.$transaction([prisma.miniAppMembership.update({where:{id:member.id},data:ban?{status:"SUSPENDED",bannedById:auth.userId,bannedAt:now,banReason:input.reason}:{status:"ACTIVE",unbannedById:auth.userId,unbannedAt:now}}),prisma.appSession.updateMany({where:{membershipId:member.id,revokedAt:null},data:{revokedAt:now}}),prisma.adminAuditLog.create({data:{miniAppId:member.miniAppId,actorUserId:auth.userId,action:ban?"TENANT_USER_BANNED_BY_SUPER_ADMIN":"TENANT_USER_UNBANNED_BY_SUPER_ADMIN",targetType:"MiniAppMembership",targetId:member.id,metadata:{reason:input.reason}}})]);return Response.json({status:ban?"SUSPENDED":"ACTIVE"});
  }catch(error){return error instanceof Response?error:Response.json({error:"Invalid membership action.",code:"INVALID_INPUT"},{status:422})}
}
