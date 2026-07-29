import { slugAvailability } from "@/features/mini-app-requests/server";
export async function GET(request:Request){const slug=new URL(request.url).searchParams.get("slug")??"";return Response.json(await slugAvailability(slug))}
