import { z } from "zod";
import { requireSuperAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/features/profile/security";

const schema=z.object({theme:z.enum(["LIGHT","DARK"])}).strict();
export async function PATCH(request:Request){
  try{
    assertSameOrigin(request);
    const auth=await requireSuperAdmin(),input=schema.parse(await request.json());
    await prisma.user.update({where:{id:auth.userId},data:{superAdminTheme:input.theme}});
    return Response.json({theme:input.theme});
  }catch(error){return error instanceof Response?error:Response.json({error:"Invalid preference.",code:"INVALID_INPUT"},{status:422})}
}
