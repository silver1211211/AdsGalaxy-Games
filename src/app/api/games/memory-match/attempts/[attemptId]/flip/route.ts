import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getLevel } from "@/features/memory-match/config";
import { shuffleUnmatched } from "@/features/memory-match/engine";
import {
  finalizeAttempt,
  getMemorySettings,
  serializeAttempt,
} from "@/features/memory-match/server";
import { repeatPeriodKey } from "@/features/memory-match/repeat-policy";
import type { ServerCard } from "@/features/memory-match/types";

const schema = z.object({
  index: z.number().int().min(0).max(15),
  version: z.number().int().positive(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    const session = await requireSession();
    const { attemptId } = await params;
    const input = schema.parse(await request.json());
    const settings = await getMemorySettings(session.miniAppId);
    let event: Record<string, unknown> = { type: "FIRST" };
    const updated = await prisma.$transaction(async (tx) => {
      const attempt = await tx.memoryMatchAttempt.findFirst({
        where: {
          id: attemptId,
          miniAppId: session.miniAppId,
          userId: session.userId,
        },
      });
      if (!attempt || attempt.status !== "ACTIVE")
        throw new Error("Attempt is not active");
      if (attempt.version !== input.version) throw new Error("STALE_VERSION");
      const board = attempt.board as unknown as ServerCard[];
      const selected = board[input.index];
      if (
        !selected ||
        selected.matched ||
        attempt.firstSelectedIndex === input.index
      )
        throw new Error("Invalid card");
      if (attempt.firstSelectedIndex === null) {
        return tx.memoryMatchAttempt.update({
          where: { id: attempt.id },
          data: {
            firstSelectedIndex: input.index,
            lastActivityAt: new Date(),
            version: { increment: 1 },
          },
        });
      }
      const firstIndex = attempt.firstSelectedIndex;
      const first = board[firstIndex];
      const matched = first.pairSlot === selected.pairSlot;
      let nextBoard = [...board];
      let mismatches = attempt.mismatches;
      let shuffleCount = attempt.shuffleCount;
      let combo = matched ? attempt.currentCombo + 1 : 0;
      if (matched)
        nextBoard = nextBoard.map((card) =>
          card.pairSlot === selected.pairSlot
            ? { ...card, matched: true }
            : card,
        );
      else mismatches += 1;
      const level = getLevel(attempt.level);
      let shuffled = false;
      if (
        !matched &&
        level.shuffleAfterMismatches &&
        shuffleCount < level.maxShuffles &&
        mismatches % level.shuffleAfterMismatches === 0
      ) {
        nextBoard = shuffleUnmatched(nextBoard, attempt.seed, shuffleCount + 1);
        shuffleCount += 1;
        shuffled = true;
      }
      let claimCreated = false;
      if (
        matched &&
        selected.kind !== "REGULAR" &&
        settings.specialCardsEnabled &&
        !settings.emergencyDisabled
      ) {
        const policy =
          selected.kind === "MONEY"
            ? settings.moneyRepeatPolicy
            : settings.coinRepeatPolicy;
        const pKey = repeatPeriodKey(policy);
        try {
          const entitlement = await tx.rewardEntitlement.create({
            data: {
              miniAppId: session.miniAppId,
              userId: session.userId,
              gameKey: "memory-match",
              level: attempt.level,
              rewardType: selected.kind,
              periodKey: pKey,
            },
          });
          const claim = await tx.gameRewardClaim.create({
            data: {
              miniAppId: session.miniAppId,
              userId: session.userId,
              attemptId: attempt.id,
              level: attempt.level,
              pairSlot: selected.pairSlot,
              rewardType: selected.kind,
              configuredMoneyAmount:
                selected.kind === "MONEY" ? settings.moneyRewardAmount : null,
              configuredMultiplierMin:
                selected.kind === "COIN" ? settings.coinMultiplierMin : null,
              configuredMultiplierMax:
                selected.kind === "COIN" ? settings.coinMultiplierMax : null,
              expiresAt: new Date(
                Date.now() + settings.pendingExpiryMinutes * 60_000,
              ),
            },
          });
          await tx.rewardEntitlement.update({
            where: { id: entitlement.id },
            data: { claimId: claim.id },
          });
          claimCreated = true;
        } catch {
          // A unique entitlement collision means this reward period was already consumed.
        }
      }
      event = {
        type: matched ? "MATCH" : "MISMATCH",
        matched,
        shuffled,
        firstIndex,
        secondIndex: input.index,
        revealed: [first, selected].map((card) => ({
          cardId: card.cardId,
          emoji: card.emoji,
          label: card.label,
          kind: card.kind,
          pairSlot: card.pairSlot,
        })),
      };
      return tx.memoryMatchAttempt.update({
        where: { id: attempt.id },
        data: {
          board: nextBoard,
          firstSelectedIndex: null,
          moves: { increment: 1 },
          mismatches,
          currentCombo: combo,
          highestCombo: Math.max(attempt.highestCombo, combo),
          shuffleCount,
          matchedPairSlots: nextBoard
            .filter((card) => card.matched && card.cardId.endsWith("-a"))
            .map((card) => card.pairSlot),
          status: claimCreated ? "PAUSED" : "ACTIVE",
          pausedAt: claimCreated ? new Date() : null,
          lastActivityAt: new Date(),
          version: { increment: 1 },
        },
      });
    });
    const board = updated.board as unknown as ServerCard[];
    if (board.every((card) => card.matched)) await finalizeAttempt(updated.id);
    return NextResponse.json({
      attempt: await serializeAttempt(updated.id),
      event,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : "Invalid flip";
    return NextResponse.json(
      { error: message },
      { status: message === "STALE_VERSION" ? 409 : 400 },
    );
  }
}
