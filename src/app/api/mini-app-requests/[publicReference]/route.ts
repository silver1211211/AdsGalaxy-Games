import { z } from "zod";
import { requireSession } from "@/lib/session";
import { assertSameOrigin } from "@/features/profile/security";
import { applicantRequest, respondToInformation } from "@/features/mini-app-requests/server";
export async function GET(_:Request,{params}:{params:Promise<{publicReference:string}>}){try{const auth=await requireSession(),{publicReference}=await params;const item=await applicantRequest(auth.userId,publicReference);return item?Response.json(item):Response.json({error:"Request not found."},{status:404})}catch(error){return error instanceof Response?error:Response.json({error:"Could not load request."},{status:500})}}
const schema=z.object({message:z.string().trim().min(20).max(2000)}).strict();
export async function POST(request:Request,{params}:{params:Promise<{publicReference:string}>}){try{assertSameOrigin(request);const auth=await requireSession(),{publicReference}=await params,input=schema.parse(await request.json());await respondToInformation(auth.userId,publicReference,input.message);return Response.json({ok:true})}catch(error){if(error instanceof Response)return error;return Response.json({error:error instanceof z.ZodError?error.issues[0]?.message:"Could not send response."},{status:422})}}
