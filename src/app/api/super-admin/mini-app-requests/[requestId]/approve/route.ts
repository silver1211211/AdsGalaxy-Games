import { requireSuperAdmin } from "@/lib/session";
import { tenantUrls } from "@/lib/tenant-urls";
import { assertProtectedJsonRequest } from "@/features/profile/security";
import { requireRecentAdminElevation } from "@/features/admin-security/elevation";
import { approveRequest } from "@/features/mini-app-requests/server";
import { z } from "zod";
const schema=z.object({administratorTelegramId:z.string().regex(/^\d{5,20}$/)}).strict();
export async function POST(request:Request,{params}:{params:Promise<{requestId:string}>}){try{assertProtectedJsonRequest(request,1024);const auth=await requireSuperAdmin(),{requestId}=await params,input=schema.parse(await request.json());await requireRecentAdminElevation({userId:auth.userId,scopeType:"SUPER_ADMIN"});const result=await approveRequest(requestId,auth.userId,input.administratorTelegramId);const urls=tenantUrls(result.tenant.slug,process.env.NEXT_PUBLIC_APP_URL??new URL(request.url).origin);return Response.json({request:{id:result.request.id,status:result.request.status,publicReference:result.request.publicReference},tenant:{id:result.tenant.id,name:result.tenant.name,slug:result.tenant.slug,status:result.tenant.status},temporaryPassword:result.temporaryPassword,urls,telegramAccess:"PENDING_BOT_CONFIGURATION"})}catch(error){if(error instanceof Response)return error;return Response.json({error:"Approval could not be completed safely.",diagnosticReference:crypto.randomUUID().slice(0,8).toUpperCase(),code:"APPROVAL_FAILED"},{status:422})}}
