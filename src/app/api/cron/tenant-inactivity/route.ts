import { prisma } from "@/lib/prisma";
import { evaluateTenantInactivity } from "@/features/super-admin/tenant-inactivity";

export async function POST(request:Request){
  const secret=process.env.CRON_SECRET;
  if(!secret||request.headers.get("authorization")!==`Bearer ${secret}`)return new Response(null,{status:404});
  const actor=await prisma.miniAppMembership.findFirst({where:{role:"SUPER_ADMIN",status:"ACTIVE",user:{status:"ACTIVE"}},select:{userId:true},orderBy:{createdAt:"asc"}});
  if(!actor)return Response.json({error:"No active Super Admin audit actor is configured."},{status:503});
  try{return Response.json(await evaluateTenantInactivity({dryRun:false,actorUserId:actor.userId}))}
  catch{return Response.json({error:"Inactivity evaluation failed safely."},{status:500})}
}
