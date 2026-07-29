import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { assertSameOrigin, rateLimit } from "@/features/profile/security";
import { evaluateTenantInactivity, validInactivityPolicy } from "@/features/super-admin/tenant-inactivity";

const policySchema=z.object({
  enabled:z.boolean(),automaticSuspension:z.boolean(),windowDays:z.number().int(),minimumUsers:z.number().int(),
  graceDays:z.number().int(),warningDays:z.number().int(),cooldownDays:z.number().int(),suspensionMessage:z.string().trim()
}).strict();
const actionSchema=z.object({action:z.enum(["RUN","DRY_RUN"])}).strict();

export async function PATCH(request:Request){
  try{
    assertSameOrigin(request);const auth=await requireSuperAdmin();rateLimit(`sa-inactivity-policy:${auth.userId}`,6,60_000);
    const input=policySchema.parse(await request.json());if(!validInactivityPolicy(input))return Response.json({error:"Policy values are outside safe limits."},{status:422});
    if(input.automaticSuspension&&Date.now()-auth.appSession.createdAt.getTime()>30*60_000)return Response.json({error:"Recent authentication is required to enable automatic suspension."},{status:403});
    const settings=await prisma.$transaction(async tx=>{
      const value=await tx.platformConfiguration.upsert({where:{id:"platform"},create:{id:"platform",inactivityPolicyEnabled:input.enabled,inactivityAutomaticSuspension:input.automaticSuspension,inactivityWindowDays:input.windowDays,inactivityMinimumUsers:input.minimumUsers,inactivityGraceDays:input.graceDays,inactivityWarningDays:input.warningDays,inactivityCooldownDays:input.cooldownDays,inactivitySuspensionMessage:input.suspensionMessage},update:{inactivityPolicyEnabled:input.enabled,inactivityAutomaticSuspension:input.automaticSuspension,inactivityWindowDays:input.windowDays,inactivityMinimumUsers:input.minimumUsers,inactivityGraceDays:input.graceDays,inactivityWarningDays:input.warningDays,inactivityCooldownDays:input.cooldownDays,inactivitySuspensionMessage:input.suspensionMessage,updatedBySuperAdminId:auth.userId}});
      await tx.adminAuditLog.create({data:{actorUserId:auth.userId,action:"INACTIVITY_POLICY_CHANGED",targetType:"PlatformConfiguration",targetId:value.id,after:{...input}}});return value;
    });return Response.json({settings});
  }catch(error){return error instanceof Response?error:Response.json({error:"Invalid inactivity policy."},{status:422})}
}

export async function POST(request:Request){
  try{assertSameOrigin(request);const auth=await requireSuperAdmin();rateLimit(`sa-inactivity-run:${auth.userId}`,3,60_000);const input=actionSchema.parse(await request.json());return Response.json(await evaluateTenantInactivity({dryRun:input.action==="DRY_RUN",actorUserId:auth.userId}))}
  catch(error){return error instanceof Response?error:Response.json({error:"Inactivity evaluation failed safely."},{status:500})}
}
