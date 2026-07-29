/*
  Warnings:

  - Added the required column `placement` to the `sponsored_campaign_events` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "mini_apps" ADD COLUMN     "inactivity_exempt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inactivity_exempt_reason" VARCHAR(300),
ADD COLUMN     "inactivity_exempt_until" TIMESTAMP(3),
ADD COLUMN     "inactivity_last_checked_at" TIMESTAMP(3),
ADD COLUMN     "inactivity_reason" VARCHAR(32),
ADD COLUMN     "inactivity_resume_at" TIMESTAMP(3),
ADD COLUMN     "inactivity_suspended_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "platform_configuration" ADD COLUMN     "inactivity_automatic_suspension" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inactivity_cooldown_days" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "inactivity_grace_days" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "inactivity_minimum_users" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "inactivity_policy_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "inactivity_suspension_message" VARCHAR(300) NOT NULL DEFAULT 'This Mini App is temporarily unavailable while its activity status is reviewed.',
ADD COLUMN     "inactivity_warning_days" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "inactivity_window_days" INTEGER NOT NULL DEFAULT 7;

-- AlterTable
ALTER TABLE "sponsored_campaign_events" ADD COLUMN     "placement" VARCHAR(40) NOT NULL;

-- CreateTable
CREATE TABLE "tenant_inactivity_evaluations" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "legitimate_users" INTEGER NOT NULL,
    "required_users" INTEGER NOT NULL,
    "result" VARCHAR(32) NOT NULL,
    "dry_run" BOOLEAN NOT NULL DEFAULT false,
    "action_taken" BOOLEAN NOT NULL DEFAULT false,
    "evaluated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_inactivity_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_inactivity_evaluations_evaluated_at_idx" ON "tenant_inactivity_evaluations"("evaluated_at");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_inactivity_evaluations_mini_app_id_window_start_wind_key" ON "tenant_inactivity_evaluations"("mini_app_id", "window_start", "window_end", "dry_run");

-- AddForeignKey
ALTER TABLE "tenant_inactivity_evaluations" ADD CONSTRAINT "tenant_inactivity_evaluations_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
