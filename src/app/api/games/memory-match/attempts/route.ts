import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import {
  createDeck,
  selectRewardAssignment,
} from "@/features/memory-match/engine";
import { getLevel } from "@/features/memory-match/config";
import {
  getMemorySettings,
  serializeAttempt,
} from "@/features/memory-match/server";

const schema = z.object({ level: z.number().int().min(1).max(15) });

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const { level } = schema.parse(await request.json());
    const settings = await getMemorySettings(session.miniAppId);
    if (!settings.enabled)
      return NextResponse.json(
        { error: "Memory Match is disabled" },
        { status: 403 },
      );
    const highest = await prisma.memoryMatchAttempt.aggregate({
      where: {
        miniAppId: session.miniAppId,
        userId: session.userId,
        status: "COMPLETED",
      },
      _max: { level: true },
    });
    if (level > Math.min(15, (highest._max.level ?? 0) + 1))
      return NextResponse.json({ error: "Level is locked" }, { status: 403 });
    const existing = await prisma.memoryMatchAttempt.findFirst({
      where: {
        miniAppId: session.miniAppId,
        userId: session.userId,
        level,
        status: { in: ["ACTIVE", "PAUSED"] },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (existing)
      return NextResponse.json({
        attempt: await serializeAttempt(existing.id),
        restored: true,
      });
    const seed = crypto.randomUUID();
    const assignment = selectRewardAssignment(level, seed, settings);
    const board = createDeck(level, seed, assignment);
    const attempt = await prisma.memoryMatchAttempt.create({
      data: {
        miniAppId: session.miniAppId,
        userId: session.userId,
        level,
        seed,
        rewardAssignment: assignment,
        board,
        matchedPairSlots: [],
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    return NextResponse.json(
      { attempt: await serializeAttempt(attempt.id), restored: false },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error(error);
    return NextResponse.json(
      { error: "Could not start level" },
      { status: 400 },
    );
  }
}
