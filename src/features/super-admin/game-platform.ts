import { prisma } from "@/lib/prisma";
export const GAME_KEYS=["memory-match","quiz-challenge","tap-collector","maze-runner"] as const;
export type GameKey=(typeof GAME_KEYS)[number];
export function isGameKey(value:string):value is GameKey{return (GAME_KEYS as readonly string[]).includes(value)}
export async function resolvedGamePlatformConfig(gameKey:GameKey,miniAppId:string){
  const defaults=await prisma.gamePlatformDefault.upsert({where:{gameKey},create:{gameKey},update:{},include:{overrides:{where:{miniAppId},take:1}}});
  const base=(defaults.configuration??{}) as Record<string,unknown>,override=(defaults.overrides[0]?.configuration??{}) as Record<string,unknown>;
  return {enabled:defaults.enabled&&!defaults.emergencyDisabled,configuration:{...base,...override},inherited:!defaults.overrides.length};
}
