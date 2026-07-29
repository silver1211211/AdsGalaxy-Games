import { prisma } from "../../lib/prisma";

export type InactivityPolicy = {
  enabled: boolean;
  automaticSuspension: boolean;
  windowDays: number;
  minimumUsers: number;
  graceDays: number;
  warningDays: number;
  cooldownDays: number;
  suspensionMessage: string;
};

export function validInactivityPolicy(policy: InactivityPolicy) {
  return policy.windowDays >= 1 && policy.windowDays <= 30
    && policy.minimumUsers >= 1 && policy.minimumUsers <= 10_000
    && policy.graceDays >= policy.windowDays && policy.graceDays <= 180
    && policy.warningDays >= 0 && policy.warningDays <= policy.windowDays
    && policy.cooldownDays >= 1 && policy.cooldownDays <= 90
    && policy.suspensionMessage.trim().length >= 10 && policy.suspensionMessage.length <= 300;
}

export function completedWindow(now: Date, days: number) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end.getTime() - days * 86_400_000);
  return { start, end };
}

export async function evaluateTenantInactivity(options: { dryRun: boolean; actorUserId: string; now?: Date }) {
  const now = options.now ?? new Date();
  const config = await prisma.platformConfiguration.upsert({where:{id:"platform"},create:{id:"platform"},update:{}});
  const policy: InactivityPolicy = {
    enabled: config.inactivityPolicyEnabled,
    automaticSuspension: config.inactivityAutomaticSuspension,
    windowDays: config.inactivityWindowDays,
    minimumUsers: config.inactivityMinimumUsers,
    graceDays: config.inactivityGraceDays,
    warningDays: config.inactivityWarningDays,
    cooldownDays: config.inactivityCooldownDays,
    suspensionMessage: config.inactivitySuspensionMessage,
  };
  if (!validInactivityPolicy(policy)) throw new Error("Invalid inactivity policy");
  if (!policy.enabled) return { policy, evaluated: 0, suspended: 0, results: [] };
  const window = completedWindow(now, policy.windowDays);
  const tenants = await prisma.miniApp.findMany({
    where:{status:{in:["ACTIVE","PAUSED"]}},
    select:{id:true,name:true,status:true,createdAt:true,inactivityExempt:true,inactivityExemptUntil:true,inactivityResumeAt:true,inactivityReason:true},
  });
  const results: Array<{tenantId:string;name:string;legitimateUsers:number;result:string;actionTaken:boolean}> = [];
  let suspended = 0;
  for (const tenant of tenants) {
    let result = "MEETING_TARGET", actionTaken = false;
    const graceEnds = new Date(tenant.createdAt.getTime() + policy.graceDays * 86_400_000);
    const exempt = tenant.inactivityExempt && (!tenant.inactivityExemptUntil || tenant.inactivityExemptUntil > now);
    const cooldown = tenant.inactivityResumeAt && tenant.inactivityResumeAt > new Date(now.getTime() - policy.cooldownDays * 86_400_000);
    const legitimateUsers = await prisma.miniAppMembership.count({where:{
      miniAppId:tenant.id, role:"USER", status:"ACTIVE", createdAt:{gte:window.start,lt:window.end},
      user:{status:"ACTIVE",username:{not:"local_developer"},telegramId:{notIn:[BigInt("999000001"),BigInt("999000003")]}}
    }});
    if(tenant.status!=="ACTIVE") result="SKIPPED_STATUS";
    else if(exempt) result="EXEMPT";
    else if(now<graceEnds) result="GRACE_PERIOD";
    else if(cooldown) result="COOLDOWN";
    else if(legitimateUsers<policy.minimumUsers) result="AT_RISK";
    if(result==="AT_RISK"&&policy.automaticSuspension&&!options.dryRun){
      const existing=await prisma.tenantInactivityEvaluation.findUnique({where:{miniAppId_windowStart_windowEnd_dryRun:{miniAppId:tenant.id,windowStart:window.start,windowEnd:window.end,dryRun:false}}});
      if(!existing){
        await prisma.$transaction(async tx=>{
          await tx.miniApp.update({where:{id:tenant.id},data:{status:"PAUSED",inactivitySuspendedAt:now,inactivityReason:"INACTIVITY",inactivityLastCheckedAt:now}});
          await tx.tenantInactivityEvaluation.create({data:{miniAppId:tenant.id,windowStart:window.start,windowEnd:window.end,legitimateUsers,requiredUsers:policy.minimumUsers,result:"SUSPENDED",actionTaken:true}});
          await tx.platformAlert.create({data:{miniAppId:tenant.id,type:"TENANT_INACTIVITY",severity:"WARNING",title:"Temporarily suspended for inactivity",summary:`${tenant.name} added ${legitimateUsers} of ${policy.minimumUsers} required legitimate users.`}});
          await tx.tenantAdminNotification.create({data:{miniAppId:tenant.id,type:"TENANT_INACTIVITY",severity:"WARNING",title:"Temporarily suspended for inactivity",body:"This Mini App was temporarily suspended because it added fewer than the required number of new users during the latest activity period."}});
          await tx.adminAuditLog.create({data:{miniAppId:tenant.id,actorUserId:options.actorUserId,action:"TENANT_AUTOMATICALLY_SUSPENDED_INACTIVITY",targetType:"MiniApp",targetId:tenant.id,before:{status:"ACTIVE"},after:{status:"PAUSED",reason:"INACTIVITY"},metadata:{windowStart:window.start,windowEnd:window.end,legitimateUsers,requiredUsers:policy.minimumUsers}}});
        });
        result="SUSPENDED";actionTaken=true;suspended++;
      }
    } else if(!options.dryRun) {
      await prisma.$transaction([
        prisma.miniApp.update({where:{id:tenant.id},data:{inactivityLastCheckedAt:now}}),
        prisma.tenantInactivityEvaluation.upsert({where:{miniAppId_windowStart_windowEnd_dryRun:{miniAppId:tenant.id,windowStart:window.start,windowEnd:window.end,dryRun:false}},create:{miniAppId:tenant.id,windowStart:window.start,windowEnd:window.end,legitimateUsers,requiredUsers:policy.minimumUsers,result},update:{legitimateUsers,result}}),
      ]);
    }
    results.push({tenantId:tenant.id,name:tenant.name,legitimateUsers,result,actionTaken});
  }
  return {policy,evaluated:results.length,suspended,window,results};
}
