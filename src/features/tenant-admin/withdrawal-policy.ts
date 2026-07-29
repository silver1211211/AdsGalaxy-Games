import { WithdrawalStatus } from "@prisma/client";
export const WITHDRAWAL_TRANSITIONS: Record<
  WithdrawalStatus,
  WithdrawalStatus[]
> = {
  PENDING: ["UNDER_REVIEW", "APPROVED", "PROCESSING", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["PROCESSING", "REJECTED"],
  PROCESSING: ["COMPLETED", "REJECTED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};
export function canTransitionWithdrawal(
  from: WithdrawalStatus,
  to: WithdrawalStatus,
) {
  return WITHDRAWAL_TRANSITIONS[from].includes(to);
}
