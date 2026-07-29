import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("REQUEST"), claimId: z.string() }),
  z.object({ action: z.literal("RESULT"), claimId: z.string(), requestId: z.string().uuid(),
    outcome: z.enum(["COMPLETED", "NO_FILL", "TIMEOUT", "SDK_UNAVAILABLE", "SDK_ERROR"]) }),
]);
export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const auth = await requireSession(), { sessionId } = await params, input = schema.parse(await request.json());
    const claim = await prisma.gameRewardClaim.findFirst({
      where: { id: input.claimId, tapCollectorSessionId: sessionId, userId: auth.userId, miniAppId: auth.miniAppId, rewardType: "MONEY" },
    });
    if (!claim) return NextResponse.json({ error: "Money claim not found" }, { status: 404 });
    if (input.action === "REQUEST") {
      const ads = await prisma.adsGalaxyConfiguration.findUnique({ where: { miniAppId: auth.miniAppId } });
      if (!ads?.enabled || !ads.miniAppPublicId) return NextResponse.json({ error: "Ads Galaxy is unavailable. Continue without claiming." }, { status: 503 });
      const requestId = claim.internalAdRequestId ?? crypto.randomUUID();
      const updated = await prisma.gameRewardClaim.update({
        where: { id: claim.id }, data: { status: "AD_REQUESTED", internalAdRequestId: requestId, adRequestedAt: claim.adRequestedAt ?? new Date() },
      });
      return NextResponse.json({ claimId: updated.id, requestId, adsGalaxyMiniAppId: ads.miniAppPublicId, environment: ads.environment, context: "catch_rush_money" });
    }
    if (claim.internalAdRequestId !== input.requestId) return NextResponse.json({ error: "Claim request mismatch" }, { status: 409 });
    const completed = input.outcome === "COMPLETED";
    await prisma.gameRewardClaim.update({ where: { id: claim.id }, data: completed
      ? { status: "PENDING_VERIFICATION", browserCompletedAt: new Date() }
      : { status: input.outcome === "NO_FILL" ? "NO_FILL" : "FAILED", errorCode: input.outcome, nextRetryAt: new Date(Date.now() + 60_000) } });
    return NextResponse.json({ status: completed ? "PENDING_VERIFICATION" : input.outcome,
      message: completed ? "Ad viewed. Reward pending trusted provider verification." : "No reward was issued. You can continue the stage." });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not process claim" }, { status: 422 });
  }
}
