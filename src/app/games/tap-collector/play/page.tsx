import { headers } from "next/headers";
import { TapGame } from "@/components/tap-collector/tap-game";
import { PreviewTapGame } from "@/components/development/preview-tap-game";
import { getPreviewSession } from "@/lib/development-preview/context";
export default async function TapPlayPage(){const preview=await getPreviewSession((await headers()).get("host"));return preview?<PreviewTapGame play/>:<TapGame/>}
