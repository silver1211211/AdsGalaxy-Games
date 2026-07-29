import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { assertSameOrigin } from "@/features/profile/security";
const schema=z.object({body:z.string().trim().min(2).max(1000)}).strict();
export async function POST(request:Request,{params}:{params:Promise<{userId:string}>}){
  try{assertSameOrigin(request);const auth=await requireSuperAdmin(),{userId}=await params,input=schema.parse(await request.json());
    if(!await prisma.user.findUnique({where:{id:userId},select:{id:true}}))return Response.json({error:"User not found.",code:"USER_NOT_FOUND"},{status:404});
    const note=await prisma.$transaction(async tx=>{const n=await tx.superAdminUserNote.create({data:{userId,authorUserId:auth.userId,body:input.body}});await tx.adminAuditLog.create({data:{actorUserId:auth.userId,action:"SUPER_ADMIN_NOTE_CREATED",targetType:"User",targetId:userId,metadata:{noteId:n.id}}});return n});return Response.json({note:{id:note.id,body:note.body,createdAt:note.createdAt}},{status:201});
  }catch(error){return error instanceof Response?error:Response.json({error:"Invalid note.",code:"INVALID_INPUT"},{status:422})}
}
