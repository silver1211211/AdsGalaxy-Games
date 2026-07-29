import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { assertSameOrigin, rateLimit } from "@/features/profile/security";
import { normalizeTenantSlug, validTenantSlug } from "@/features/super-admin/policy";
import { provisionTenant } from "@/features/super-admin/tenant-provisioning";

const createSchema=z.object({
  name:z.string().trim().min(2).max(100),slug:z.string().trim().min(2).max(64),
  description:z.string().trim().max(500).optional(),status:z.enum(["ACTIVE","PAUSED"]).default("ACTIVE"),
  administratorUserId:z.string().cuid().optional(),
}).strict();

export async function GET(request:Request){
  try{
    await requireSuperAdmin(); const url=new URL(request.url),q=url.searchParams.get("q")?.trim().slice(0,80);
    const page=Math.max(1,Number(url.searchParams.get("page")??1)||1),take=20;
    const where:Prisma.MiniAppWhereInput=q?{OR:[{name:{contains:q,mode:"insensitive"}},{slug:{contains:q,mode:"insensitive"}},{id:q}]}:{};
    const [items,total]=await Promise.all([
      prisma.miniApp.findMany({where,include:{_count:{select:{memberships:true}},memberships:{where:{role:"ADMIN",status:"ACTIVE"},include:{user:true},take:1},adminSettings:true,botConfiguration:true,adConfiguration:true,oxaPayCredential:true},orderBy:{createdAt:"desc"},skip:(page-1)*take,take}),
      prisma.miniApp.count({where}),
    ]);
    return Response.json({items,total,page,pages:Math.ceil(total/take)});
  }catch(error){return error instanceof Response?error:Response.json({error:"Could not load tenants.",code:"INTERNAL_ERROR"},{status:500})}
}

export async function POST(request:Request){
  try{
    assertSameOrigin(request); const auth=await requireSuperAdmin(); rateLimit(`sa-tenant-create:${auth.userId}`,5,60_000);
    const input=createSchema.parse(await request.json()),slug=normalizeTenantSlug(input.slug);
    if(!validTenantSlug(slug))return Response.json({error:"Choose a safe, non-reserved tenant slug.",code:"INVALID_INPUT"},{status:422});
    const result=await prisma.$transaction(async tx=>{
      const provisioned=await provisionTenant(tx,{name:input.name,slug,description:input.description,administratorUserId:input.administratorUserId,actorUserId:auth.userId});
      return provisioned.tenant;
    });
    const base=(process.env.NEXT_PUBLIC_APP_URL??new URL(request.url).origin).replace(/\/$/,"");
    return Response.json({tenant:result,urls:{miniApp:`${base}/${result.slug}`,admin:`${base}/${result.slug}/admin`}},{status:201});
  }catch(error){
    if(error instanceof Response)return error;
    if(error instanceof z.ZodError)return Response.json({error:"Invalid tenant details.",code:"INVALID_INPUT"},{status:422});
    if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")return Response.json({error:"That tenant slug already exists.",code:"CONFLICT"},{status:409});
    return Response.json({error:"Could not create tenant.",code:"INTERNAL_ERROR"},{status:500});
  }
}
