CREATE TYPE "AppSessionSource" AS ENUM ('TELEGRAM', 'LOCAL_DEVELOPMENT');
CREATE TYPE "ProfileTheme" AS ENUM ('SYSTEM', 'LIGHT', 'DARK');
CREATE TYPE "DataRequestStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "DeletionRequestStatus" AS ENUM ('PENDING', 'CANCELLED', 'BLOCKED', 'COMPLETED');

ALTER TABLE "users"
  ADD COLUMN "telegram_premium" BOOLEAN,
  ADD COLUMN "telegram_synced_at" TIMESTAMP(3);

ALTER TABLE "mini_app_memberships"
  ADD COLUMN "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "mini_app_user_profiles" (
  "id" TEXT NOT NULL,
  "mini_app_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "display_name_override" VARCHAR(40),
  "bio" VARCHAR(160),
  "custom_avatar_key" TEXT,
  "locale" VARCHAR(16) NOT NULL DEFAULT 'en-US',
  "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
  "theme_preference" "ProfileTheme" NOT NULL DEFAULT 'SYSTEM',
  "sound_enabled" BOOLEAN NOT NULL DEFAULT true,
  "haptics_enabled" BOOLEAN NOT NULL DEFAULT true,
  "reduced_motion_enabled" BOOLEAN NOT NULL DEFAULT false,
  "game_confirmations_enabled" BOOLEAN NOT NULL DEFAULT true,
  "auto_pause_enabled" BOOLEAN NOT NULL DEFAULT true,
  "larger_tap_targets_enabled" BOOLEAN NOT NULL DEFAULT false,
  "high_contrast_enabled" BOOLEAN NOT NULL DEFAULT false,
  "simplified_animations" BOOLEAN NOT NULL DEFAULT false,
  "wallet_notifications" BOOLEAN NOT NULL DEFAULT true,
  "withdrawal_notifications" BOOLEAN NOT NULL DEFAULT true,
  "task_notifications" BOOLEAN NOT NULL DEFAULT true,
  "game_notifications" BOOLEAN NOT NULL DEFAULT true,
  "reward_notifications" BOOLEAN NOT NULL DEFAULT true,
  "announcement_notifications" BOOLEAN NOT NULL DEFAULT true,
  "security_notifications" BOOLEAN NOT NULL DEFAULT true,
  "marketing_notifications" BOOLEAN NOT NULL DEFAULT false,
  "telegram_notifications" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mini_app_user_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app_sessions" (
  "id" TEXT NOT NULL,
  "mini_app_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "membership_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "source" "AppSessionSource" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "user_agent_summary" VARCHAR(120),
  "device_label" VARCHAR(80),
  CONSTRAINT "app_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "data_export_requests" (
  "id" TEXT NOT NULL, "mini_app_id" TEXT NOT NULL, "user_id" TEXT NOT NULL,
  "status" "DataRequestStatus" NOT NULL DEFAULT 'PENDING', "storage_key" TEXT,
  "expires_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "data_export_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "account_deletion_requests" (
  "id" TEXT NOT NULL, "mini_app_id" TEXT NOT NULL, "user_id" TEXT NOT NULL,
  "status" "DeletionRequestStatus" NOT NULL DEFAULT 'PENDING', "reason" VARCHAR(300),
  "execute_after" TIMESTAMP(3) NOT NULL, "cancelled_at" TIMESTAMP(3), "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_user_notes" (
  "id" TEXT NOT NULL, "mini_app_id" TEXT NOT NULL, "user_id" TEXT NOT NULL,
  "author_user_id" TEXT NOT NULL, "body" VARCHAR(1000) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_user_notes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mini_app_user_profiles_mini_app_id_user_id_key" ON "mini_app_user_profiles"("mini_app_id", "user_id");
CREATE INDEX "mini_app_user_profiles_user_id_idx" ON "mini_app_user_profiles"("user_id");
CREATE UNIQUE INDEX "app_sessions_token_hash_key" ON "app_sessions"("token_hash");
CREATE INDEX "app_sessions_mini_app_id_user_id_revoked_at_expires_at_idx" ON "app_sessions"("mini_app_id", "user_id", "revoked_at", "expires_at");
CREATE INDEX "app_sessions_membership_id_idx" ON "app_sessions"("membership_id");
CREATE INDEX "data_export_requests_mini_app_id_user_id_status_idx" ON "data_export_requests"("mini_app_id", "user_id", "status");
CREATE INDEX "account_deletion_requests_mini_app_id_user_id_status_idx" ON "account_deletion_requests"("mini_app_id", "user_id", "status");
CREATE INDEX "admin_user_notes_mini_app_id_user_id_created_at_idx" ON "admin_user_notes"("mini_app_id", "user_id", "created_at");

ALTER TABLE "mini_app_user_profiles" ADD CONSTRAINT "mini_app_user_profiles_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mini_app_user_profiles" ADD CONSTRAINT "mini_app_user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "app_sessions" ADD CONSTRAINT "app_sessions_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "app_sessions" ADD CONSTRAINT "app_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "data_export_requests" ADD CONSTRAINT "data_export_requests_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "data_export_requests" ADD CONSTRAINT "data_export_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admin_user_notes" ADD CONSTRAINT "admin_user_notes_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admin_user_notes" ADD CONSTRAINT "admin_user_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admin_user_notes" ADD CONSTRAINT "admin_user_notes_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
