ALTER TABLE "tap_collector_sessions"
  ALTER COLUMN "status" SET DEFAULT 'READY',
  ALTER COLUMN "wave_started_at" DROP NOT NULL,
  ALTER COLUMN "wave_ends_at" DROP NOT NULL,
  ALTER COLUMN "started_at" DROP NOT NULL,
  ALTER COLUMN "started_at" DROP DEFAULT;
