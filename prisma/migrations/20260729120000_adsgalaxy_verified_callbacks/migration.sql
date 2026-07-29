ALTER TABLE "ads_galaxy_configurations"
  ADD COLUMN "webhook_secret_encrypted" TEXT,
  ADD COLUMN "webhook_secret_preview" VARCHAR(24),
  ADD COLUMN "webhook_secret_version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "webhook_secret_verified_at" TIMESTAMP(3),
  ADD COLUMN "private_api_key_encrypted" TEXT,
  ADD COLUMN "private_api_key_preview" VARCHAR(24),
  ADD COLUMN "application_id" INTEGER,
  ADD COLUMN "configured_by_id" TEXT;

CREATE TABLE "ads_galaxy_ad_requests" (
  "id" TEXT NOT NULL,
  "public_reference" VARCHAR(96) NOT NULL,
  "mini_app_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "claim_id" TEXT NOT NULL,
  "purpose" VARCHAR(64) NOT NULL,
  "provider_mini_app_id" INTEGER NOT NULL,
  "provider_request_id" VARCHAR(64),
  "provider_event_id" VARCHAR(64),
  "browser_status" VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
  "provider_status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  "verification_status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "browser_completed_at" TIMESTAMP(3),
  "callback_received_at" TIMESTAMP(3),
  "verified_at" TIMESTAMP(3),
  "settled_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3) NOT NULL,
  "failure_code" VARCHAR(64),
  "failure_message" VARCHAR(300),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ads_galaxy_ad_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ads_galaxy_callback_events" (
  "id" TEXT NOT NULL,
  "provider_event_id" VARCHAR(64) NOT NULL,
  "event_type" VARCHAR(48) NOT NULL,
  "payload_digest" VARCHAR(71) NOT NULL,
  "mini_app_id" TEXT,
  "ad_request_id" TEXT,
  "provider_request_id" VARCHAR(64) NOT NULL,
  "provider_mini_app_id" INTEGER NOT NULL,
  "provider_status" VARCHAR(32) NOT NULL,
  "verification_level" VARCHAR(48) NOT NULL,
  "reward_eligible" BOOLEAN NOT NULL,
  "signature_version" VARCHAR(16) NOT NULL,
  "delivery_timestamp" TIMESTAMP(3) NOT NULL,
  "processing_status" VARCHAR(32) NOT NULL,
  "duplicate_count" INTEGER NOT NULL DEFAULT 0,
  "failure_code" VARCHAR(64),
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  CONSTRAINT "ads_galaxy_callback_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ads_galaxy_ad_requests_public_reference_key" ON "ads_galaxy_ad_requests"("public_reference");
CREATE UNIQUE INDEX "ads_galaxy_ad_requests_provider_request_id_key" ON "ads_galaxy_ad_requests"("provider_request_id");
CREATE UNIQUE INDEX "ads_galaxy_ad_requests_provider_event_id_key" ON "ads_galaxy_ad_requests"("provider_event_id");
CREATE UNIQUE INDEX "ads_galaxy_ad_requests_claim_id_purpose_key" ON "ads_galaxy_ad_requests"("claim_id", "purpose");
CREATE INDEX "ads_galaxy_ad_requests_mini_app_id_user_id_verification_status_idx" ON "ads_galaxy_ad_requests"("mini_app_id", "user_id", "verification_status");
CREATE INDEX "ads_galaxy_ad_requests_provider_status_created_at_idx" ON "ads_galaxy_ad_requests"("provider_status", "created_at");
CREATE INDEX "ads_galaxy_ad_requests_expires_at_verification_status_idx" ON "ads_galaxy_ad_requests"("expires_at", "verification_status");
CREATE UNIQUE INDEX "ads_galaxy_callback_events_provider_event_id_event_type_key" ON "ads_galaxy_callback_events"("provider_event_id", "event_type");
CREATE INDEX "ads_galaxy_callback_events_provider_request_id_idx" ON "ads_galaxy_callback_events"("provider_request_id");
CREATE INDEX "ads_galaxy_callback_events_processing_status_received_at_idx" ON "ads_galaxy_callback_events"("processing_status", "received_at");

ALTER TABLE "ads_galaxy_ad_requests" ADD CONSTRAINT "ads_galaxy_ad_requests_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "ads_galaxy_configurations"("mini_app_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ads_galaxy_ad_requests" ADD CONSTRAINT "ads_galaxy_ad_requests_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "game_reward_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ads_galaxy_callback_events" ADD CONSTRAINT "ads_galaxy_callback_events_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "ads_galaxy_configurations"("mini_app_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ads_galaxy_callback_events" ADD CONSTRAINT "ads_galaxy_callback_events_ad_request_id_fkey" FOREIGN KEY ("ad_request_id") REFERENCES "ads_galaxy_ad_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
