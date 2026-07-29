import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { issueTaskReward } from "@/features/tasks/server";
const schema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().min(3).max(500),
});
export async function POST(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  try {
    const a = await requireAdmin(),
      { submissionId } = await params,
      i = schema.parse(await request.json()),
      submission = await prisma.taskSubmission.findFirst({
        where: { id: submissionId, miniAppId: a.miniAppId },
        include: { attempt: true },
      });
    if (!submission)
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 },
      );
    if (!["PENDING_REVIEW", "PENDING_VERIFICATION"].includes(submission.status))
      return NextResponse.json(
        { error: "Submission was already reviewed" },
        { status: 409 },
      );
    const status = i.decision === "APPROVE" ? "APPROVED" : "REJECTED";
    await prisma.$transaction([
      prisma.taskSubmission.update({
        where: { id: submission.id },
        data: {
          status,
          reviewedById: a.userId,
          reviewedAt: new Date(),
          userVisibleReason: i.reason,
          verificationLabel:
            i.decision === "APPROVE" ? "Verified by Admin" : "Rejected",
        },
      }),
      prisma.taskAttempt.update({
        where: { id: submission.attemptId },
        data: {
          status,
          verifiedAt: i.decision === "APPROVE" ? new Date() : undefined,
        },
      }),
      prisma.adminAuditLog.create({
        data: {
          miniAppId: a.miniAppId,
          actorUserId: a.userId,
          action: `TASK_SUBMISSION_${status}`,
          targetType: "TaskSubmission",
          targetId: submission.id,
          metadata: { reason: i.reason },
        },
      }),
      prisma.notification.create({
        data: {
          userId: submission.userId,
          type: "TASK",
          title: i.decision === "APPROVE" ? "Task approved" : "Task rejected",
          body: i.reason,
          data: { submissionId: submission.id },
        },
      }),
    ]);
    if (i.decision === "APPROVE") await issueTaskReward(submission.attemptId);
    return NextResponse.json({
      status: i.decision === "APPROVE" ? "REWARDED" : "REJECTED",
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not review submission" },
      { status: 422 },
    );
  }
}
