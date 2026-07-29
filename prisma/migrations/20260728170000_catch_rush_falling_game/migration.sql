ALTER TYPE "TapItemType" ADD VALUE IF NOT EXISTS 'MONEY';

CREATE TYPE "TapItemClass" AS ENUM ('STANDARD', 'COIN_REWARD', 'MONEY_REWARD', 'HAZARD');

ALTER TABLE "tap_collector_sessions"
  ADD COLUMN "level" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "active_elapsed_ms" INTEGER,
  ADD COLUMN "failure_cause" TEXT,
  ADD COLUMN "failed_event_id" TEXT;

ALTER TABLE "tap_collector_spawn_events"
  ADD COLUMN "item_class" "TapItemClass" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "item_key" TEXT NOT NULL DEFAULT 'gem',
  ADD COLUMN "required" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "lane" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "fall_duration_ms" INTEGER NOT NULL DEFAULT 4000;

UPDATE "tap_collector_spawn_events"
SET "item_class" = CASE
  WHEN "item_type" = 'COIN' THEN 'COIN_REWARD'::"TapItemClass"
  WHEN "item_type" IN ('BOMB', 'TRAP') THEN 'HAZARD'::"TapItemClass"
  ELSE 'STANDARD'::"TapItemClass"
END,
"required" = ("item_type" NOT IN ('BOMB', 'TRAP'));

CREATE INDEX "tap_collector_sessions_mini_app_id_user_id_level_status_idx"
ON "tap_collector_sessions"("mini_app_id", "user_id", "level", "status");
