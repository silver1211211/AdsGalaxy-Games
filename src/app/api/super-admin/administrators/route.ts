import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { assertProtectedJsonRequest, rateLimit } from "@/features/profile/security";
import { createTemporaryAdminCredential } from "@/features/admin-security/credentials";
import { requireRecentAdminElevation } from "@/features/admin-security/elevation";
const schema=z.object({userId:z.string().cuid(),tenantId:z.string().cuid()}).strict();
export async function POST(request:Request){
  try{assertProtectedJsonRequest(request);const auth=await requireSuperAdmin();await requireRecentAdminElevation({userId:auth.userId,scopeType:"SUPER_ADMIN"});rateLimit(`sa-admin-create:${auth.userId}`,8,60_000);const input=schema.parse(await request.json());
    const [user,tenant]=await Promise.all([prisma.user.findUnique({where:{id:input.userId}}),prisma.miniApp.findUnique({where:{id:input.tenantId}})]);
    if(!user||!tenant)return Response.json({error:"User or tenant not found.",code:"ADMIN_NOT_FOUND"},{status:404});
    const membership=await prisma.$transaction(async tx=>{const m=await tx.miniAppMembership.upsert({where:{miniAppId_userId:{miniAppId:tenant.id,userId:user.id}},create:{miniAppId:tenant.id,userId:user.id,role:"ADMIN"},update:{role:"ADMIN",status:"ACTIVE"}});await tx.appSession.updateMany({where:{miniAppId:tenant.id,userId:user.id,revokedAt:null},data:{revokedAt:new Date()}});await tx.adminAuditLog.create({data:{miniAppId:tenant.id,actorUserId:auth.userId,action:"ADMINISTRATOR_ASSIGNED",targetType:"MiniAppMembership",targetId:m.id,after:{userId:user.id,tenantId:tenant.id},metadata:{sessionsRevoked:true}}});return m});
    const existing=await prisma.adminCredential.findUnique({where:{userId_scopeType:{userId:user.id,scopeType:"TENANT_ADMIN"}},select:{id:true}});
    let temporaryPassword:string|undefined;
    if(!existing){const issued=await createTemporaryAdminCredential({userId:user.id,scopeType:"TENANT_ADMIN",resetByUserId:auth.userId,miniAppId:tenant.id,reason:"Initial Administrator assignment"});temporaryPassword=issued.plaintext}
    return Response.json({membership,temporaryPassword,existingCredential:Boolean(existing)},{status:201});
  }catch(error){return error instanceof Response?error:Response.json({error:"Invalid Administrator assignment.",code:"INVALID_INPUT"},{status:422})}
}
