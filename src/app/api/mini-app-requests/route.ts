import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { assertSameOrigin, rateLimit } from "@/features/profile/security";
import { submitMiniAppRequest } from "@/features/mini-app-requests/server";
export async function POST(request:Request){
  try{assertSameOrigin(request);const auth=await requireSession();rateLimit(`mini-app-request:${auth.userId}`,3,60*60_000);
    const result=await submitMiniAppRequest(auth.userId,await request.json());
    return Response.json({publicReference:result.publicReference,proposedName:result.proposedName,requestedSlug:result.requestedSlug,status:result.status,submittedAt:result.submittedAt},{status:201});
  }catch(error){if(error instanceof Response)return error;if(error instanceof z.ZodError)return Response.json({error:error.issues[0]?.message??"Invalid request.",code:"INVALID_INPUT"},{status:422});
    if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")return Response.json({error:"That Mini App path is already reserved.",code:"CONFLICT"},{status:409});
    const message=error instanceof Error?error.message:"";const map:Record<string,string>={INVALID_SLUG:"Choose a valid available Mini App path.",ACTIVE_REQUEST_EXISTS:"You already have an active request.",SLUG_UNAVAILABLE:"That Mini App path is unavailable.",APPLICANT_UNAVAILABLE:"Your account cannot submit a request."};
    return Response.json({error:map[message]??"Could not submit request.",code:message||"INTERNAL_ERROR"},{status:message==="ACTIVE_REQUEST_EXISTS"||message==="SLUG_UNAVAILABLE"?409:422})}}
export async function GET(){try{const auth=await requireSession();const {prisma}=await import("@/lib/prisma");const items=await prisma.miniAppRequest.findMany({where:{applicantUserId:auth.userId},select:{publicReference:true,proposedName:true,requestedSlug:true,status:true,publicStatusMessage:true,submittedAt:true,updatedAt:true,createdMiniApp:{select:{slug:true}}},orderBy:{createdAt:"desc"}});return Response.json({items})}catch(error){return error instanceof Response?error:Response.json({error:"Could not load requests."},{status:500})}}
