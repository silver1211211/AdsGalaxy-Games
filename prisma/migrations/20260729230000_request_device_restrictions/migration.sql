ALTER TABLE "mini_app_requests"
ADD COLUMN "device_identifier_hash" VARCHAR(64);

CREATE INDEX "mini_app_requests_device_identifier_hash_status_idx"
ON "mini_app_requests"("device_identifier_hash", "status");

CREATE TABLE "mini_app_request_submission_overrides" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "device_identifier_hash" VARCHAR(64),
  "reason" VARCHAR(500) NOT NULL,
  "granted_by_user_id" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mini_app_request_submission_overrides_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mini_app_request_submission_overrides_target_check"
    CHECK ("user_id" IS NOT NULL OR "device_identifier_hash" IS NOT NULL)
);

CREATE INDEX "mini_app_request_submission_overrides_user_id_consumed_at_expires_at_idx"
ON "mini_app_request_submission_overrides"("user_id", "consumed_at", "expires_at");

CREATE INDEX "mini_app_request_submission_overrides_device_identifier_hash_consumed_at_expires_at_idx"
ON "mini_app_request_submission_overrides"("device_identifier_hash", "consumed_at", "expires_at");
