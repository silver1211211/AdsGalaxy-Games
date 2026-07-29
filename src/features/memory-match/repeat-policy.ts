export function repeatPeriodKey(policy: "ONCE_EVER" | "DAILY" | "WEEKLY", now = new Date()) {
  if (policy === "ONCE_EVER") return "EVER";
  if (policy === "DAILY") return now.toISOString().slice(0, 10);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = start.getUTCDay() || 7;
  start.setUTCDate(start.getUTCDate() - day + 1);
  return start.toISOString().slice(0, 10);
}
