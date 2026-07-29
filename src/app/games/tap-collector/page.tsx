import { headers } from "next/headers";
import { TapLobby } from "@/components/tap-collector/tap-lobby";
import { PreviewTapGame } from "@/components/development/preview-tap-game";
import { getPreviewSession } from "@/lib/development-preview/context";
export default async function TapCollectorPage(){const preview=await getPreviewSession((await headers()).get("host"));return preview?<PreviewTapGame/>:<TapLobby/>}
