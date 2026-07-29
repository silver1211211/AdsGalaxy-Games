CREATE TABLE "maze_runner_settings" (
  "id" TEXT NOT NULL, "mini_app_id" TEXT NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT true,
  "emergency_disabled" BOOLEAN NOT NULL DEFAULT false, "base_completion_points" INTEGER NOT NULL DEFAULT 100,
  "collectible_points" INTEGER NOT NULL DEFAULT 10, "bonus_chest_points" INTEGER NOT NULL DEFAULT 50,
  "attempt_expiry_minutes" INTEGER NOT NULL DEFAULT 120, "ad_cooldown_seconds" INTEGER NOT NULL DEFAULT 300,
  "max_ads_per_attempt" INTEGER NOT NULL DEFAULT 2, "continue_enabled" BOOLEAN NOT NULL DEFAULT true,
  "hint_enabled" BOOLEAN NOT NULL DEFAULT true, "double_points_enabled" BOOLEAN NOT NULL DEFAULT true,
  "bonus_chest_enabled" BOOLEAN NOT NULL DEFAULT true, "updated_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "maze_runner_settings_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "maze_runner_attempts" (
  "id" TEXT NOT NULL, "public_reference" VARCHAR(80) NOT NULL, "mini_app_id" TEXT NOT NULL, "user_id" TEXT NOT NULL,
  "level" INTEGER NOT NULL, "seed" VARCHAR(80) NOT NULL, "maze_version" INTEGER NOT NULL DEFAULT 1,
  "status" VARCHAR(24) NOT NULL DEFAULT 'ACTIVE', "player_x" INTEGER NOT NULL, "player_y" INTEGER NOT NULL,
  "keys_collected" JSONB NOT NULL DEFAULT '[]', "gates_opened" JSONB NOT NULL DEFAULT '[]',
  "collectibles_collected" JSONB NOT NULL DEFAULT '[]', "checkpoint_state" JSONB, "boosts_used" JSONB NOT NULL DEFAULT '[]',
  "lives_remaining" INTEGER NOT NULL DEFAULT 1, "move_count" INTEGER NOT NULL DEFAULT 0, "version" INTEGER NOT NULL DEFAULT 1,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "paused_at" TIMESTAMP(3), "paused_duration_ms" INTEGER NOT NULL DEFAULT 0,
  "completed_at" TIMESTAMP(3), "failed_at" TIMESTAMP(3), "failure_reason" VARCHAR(48), "active_elapsed_ms" INTEGER,
  "base_points" INTEGER NOT NULL DEFAULT 0, "final_points" INTEGER NOT NULL DEFAULT 0, "rating" INTEGER,
  "last_ad_requested_at" TIMESTAMP(3), "ad_count" INTEGER NOT NULL DEFAULT 0, "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "maze_runner_attempts_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "maze_runner_moves" (
  "id" TEXT NOT NULL, "attempt_id" TEXT NOT NULL, "move_index" INTEGER NOT NULL, "idempotency_key" VARCHAR(80) NOT NULL,
  "from_x" INTEGER NOT NULL, "from_y" INTEGER NOT NULL, "to_x" INTEGER NOT NULL, "to_y" INTEGER NOT NULL,
  "direction" VARCHAR(8) NOT NULL, "result" VARCHAR(32) NOT NULL, "event_type" VARCHAR(32),
  "server_received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "maze_runner_moves_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "maze_runner_progress" (
  "id" TEXT NOT NULL, "mini_app_id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "level" INTEGER NOT NULL,
  "completion_count" INTEGER NOT NULL DEFAULT 0, "best_time_ms" INTEGER, "best_rating" INTEGER NOT NULL DEFAULT 0,
  "best_points" INTEGER NOT NULL DEFAULT 0, "first_completed_at" TIMESTAMP(3), "last_completed_at" TIMESTAMP(3),
  CONSTRAINT "maze_runner_progress_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "game_reward_claims" ADD COLUMN "maze_runner_attempt_id" TEXT;
CREATE UNIQUE INDEX "maze_runner_settings_mini_app_id_key" ON "maze_runner_settings"("mini_app_id");
CREATE UNIQUE INDEX "maze_runner_attempts_public_reference_key" ON "maze_runner_attempts"("public_reference");
CREATE INDEX "maze_runner_attempts_mini_app_id_user_id_level_status_idx" ON "maze_runner_attempts"("mini_app_id","user_id","level","status");
CREATE INDEX "maze_runner_attempts_expires_at_status_idx" ON "maze_runner_attempts"("expires_at","status");
CREATE UNIQUE INDEX "maze_runner_moves_attempt_id_move_index_key" ON "maze_runner_moves"("attempt_id","move_index");
CREATE UNIQUE INDEX "maze_runner_moves_attempt_id_idempotency_key_key" ON "maze_runner_moves"("attempt_id","idempotency_key");
CREATE UNIQUE INDEX "maze_runner_progress_mini_app_id_user_id_level_key" ON "maze_runner_progress"("mini_app_id","user_id","level");
CREATE INDEX "maze_runner_progress_mini_app_id_user_id_idx" ON "maze_runner_progress"("mini_app_id","user_id");
CREATE INDEX "game_reward_claims_maze_runner_attempt_id_claim_context_idx" ON "game_reward_claims"("maze_runner_attempt_id","claim_context");
ALTER TABLE "maze_runner_settings" ADD CONSTRAINT "maze_runner_settings_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maze_runner_attempts" ADD CONSTRAINT "maze_runner_attempts_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maze_runner_attempts" ADD CONSTRAINT "maze_runner_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maze_runner_moves" ADD CONSTRAINT "maze_runner_moves_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "maze_runner_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maze_runner_progress" ADD CONSTRAINT "maze_runner_progress_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maze_runner_progress" ADD CONSTRAINT "maze_runner_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "game_reward_claims" ADD CONSTRAINT "game_reward_claims_maze_runner_attempt_id_fkey" FOREIGN KEY ("maze_runner_attempt_id") REFERENCES "maze_runner_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
