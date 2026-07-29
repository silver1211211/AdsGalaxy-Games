import { prisma } from "@/lib/prisma";
export async function GET(request:Request){
  const secret=process.env.CRON_SECRET;
  if(!secret||request.headers.get("authorization")!==`Bearer ${secret}`)return Response.json({error:"Unauthorized"},{status:401});
  const now=new Date(),releaseAt=new Date(now.getTime()+7*86_400_000);
  const expired=await prisma.$transaction(async tx=>{
    const items=await tx.miniAppRequest.findMany({where:{status:{in:["SUBMITTED","UNDER_REVIEW","INFORMATION_REQUIRED"]},expiresAt:{lte:now}},select:{id:true,applicantUserId:true,publicReference:true,status:true}});
    for(const item of items){
      await tx.miniAppRequest.update({where:{id:item.id},data:{status:"EXPIRED",publicStatusMessage:"This request expired before review was completed.",events:{create:{previousStatus:item.status,nextStatus:"EXPIRED",publicMessage:"Request expired"}}}});
      await tx.miniAppSlugReservation.update({where:{requestId:item.id},data:{status:"RELEASE_SCHEDULED",releaseAt}});
      if(item.applicantUserId)await tx.notification.create({data:{userId:item.applicantUserId,title:"Mini App request expired",body:`${item.publicReference} has expired.`,data:{publicReference:item.publicReference}}});
    }
    await tx.miniAppSlugReservation.updateMany({where:{status:"RELEASE_SCHEDULED",releaseAt:{lte:now}},data:{status:"RELEASED"}});
    return items.length;
  });
  return Response.json({expired,processedAt:now.toISOString()});
}
