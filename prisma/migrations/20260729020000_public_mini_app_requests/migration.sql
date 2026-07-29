CREATE TYPE "MiniAppRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'INFORMATION_REQUIRED', 'APPROVED', 'REJECTED', 'CANCELED', 'EXPIRED');
CREATE TYPE "MiniAppRequestSender" AS ENUM ('APPLICANT', 'SUPER_ADMIN', 'SYSTEM');
CREATE TYPE "MiniAppRequestMessageVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "MiniAppSlugReservationStatus" AS ENUM ('RESERVED', 'CONVERTED', 'RELEASE_SCHEDULED', 'RELEASED');

CREATE TABLE "mini_app_requests" (
  "id" TEXT NOT NULL,
  "public_reference" VARCHAR(20) NOT NULL,
  "applicant_user_id" TEXT NOT NULL,
  "proposed_name" VARCHAR(100) NOT NULL,
  "requested_slug" VARCHAR(40) NOT NULL,
  "description" VARCHAR(500) NOT NULL,
  "intended_audience" VARCHAR(500) NOT NULL,
  "category" VARCHAR(32) NOT NULL,
  "contact_method" VARCHAR(160) NOT NULL,
  "primary_promotion_channel" VARCHAR(32) NOT NULL,
  "primary_promotion_url" VARCHAR(500) NOT NULL,
  "estimated_audience_size" INTEGER NOT NULL,
  "expected_first_week_users" INTEGER NOT NULL,
  "promotion_plan" VARCHAR(2000) NOT NULL,
  "additional_links" JSONB NOT NULL DEFAULT '[]',
  "status" "MiniAppRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
  "assigned_reviewer_id" TEXT,
  "public_status_message" VARCHAR(1000),
  "private_review_note" VARCHAR(2000),
  "idempotency_key" VARCHAR(100) NOT NULL,
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "review_started_at" TIMESTAMP(3),
  "approved_at" TIMESTAMP(3),
  "rejected_at" TIMESTAMP(3),
  "canceled_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_mini_app_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mini_app_requests_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "mini_app_request_messages" (
  "id" TEXT NOT NULL, "request_id" TEXT NOT NULL, "sender_type" "MiniAppRequestSender" NOT NULL,
  "sender_user_id" TEXT, "message" VARCHAR(2000) NOT NULL,
  "visibility" "MiniAppRequestMessageVisibility" NOT NULL DEFAULT 'PUBLIC',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mini_app_request_messages_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "mini_app_request_status_events" (
  "id" TEXT NOT NULL, "request_id" TEXT NOT NULL, "previous_status" "MiniAppRequestStatus",
  "next_status" "MiniAppRequestStatus" NOT NULL, "actor_user_id" TEXT,
  "public_message" VARCHAR(1000), "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mini_app_request_status_events_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "mini_app_slug_reservations" (
  "id" TEXT NOT NULL, "slug" VARCHAR(40) NOT NULL, "request_id" TEXT NOT NULL,
  "status" "MiniAppSlugReservationStatus" NOT NULL DEFAULT 'RESERVED',
  "reserved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "release_at" TIMESTAMP(3), "converted_mini_app_id" TEXT,
  CONSTRAINT "mini_app_slug_reservations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "mini_app_requests_public_reference_key" ON "mini_app_requests"("public_reference");
CREATE UNIQUE INDEX "mini_app_requests_idempotency_key_key" ON "mini_app_requests"("idempotency_key");
CREATE UNIQUE INDEX "mini_app_requests_created_mini_app_id_key" ON "mini_app_requests"("created_mini_app_id");
CREATE INDEX "mini_app_requests_applicant_user_id_status_created_at_idx" ON "mini_app_requests"("applicant_user_id","status","created_at");
CREATE INDEX "mini_app_requests_status_submitted_at_idx" ON "mini_app_requests"("status","submitted_at");
CREATE INDEX "mini_app_request_messages_request_id_visibility_created_at_idx" ON "mini_app_request_messages"("request_id","visibility","created_at");
CREATE INDEX "mini_app_request_status_events_request_id_created_at_idx" ON "mini_app_request_status_events"("request_id","created_at");
CREATE UNIQUE INDEX "mini_app_slug_reservations_slug_key" ON "mini_app_slug_reservations"("slug");
CREATE UNIQUE INDEX "mini_app_slug_reservations_request_id_key" ON "mini_app_slug_reservations"("request_id");
CREATE INDEX "mini_app_slug_reservations_status_release_at_idx" ON "mini_app_slug_reservations"("status","release_at");
ALTER TABLE "mini_app_requests" ADD CONSTRAINT "mini_app_requests_applicant_user_id_fkey" FOREIGN KEY ("applicant_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mini_app_requests" ADD CONSTRAINT "mini_app_requests_assigned_reviewer_id_fkey" FOREIGN KEY ("assigned_reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mini_app_requests" ADD CONSTRAINT "mini_app_requests_created_mini_app_id_fkey" FOREIGN KEY ("created_mini_app_id") REFERENCES "mini_apps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mini_app_request_messages" ADD CONSTRAINT "mini_app_request_messages_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "mini_app_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mini_app_request_messages" ADD CONSTRAINT "mini_app_request_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mini_app_request_status_events" ADD CONSTRAINT "mini_app_request_status_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "mini_app_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mini_app_request_status_events" ADD CONSTRAINT "mini_app_request_status_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mini_app_slug_reservations" ADD CONSTRAINT "mini_app_slug_reservations_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "mini_app_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
