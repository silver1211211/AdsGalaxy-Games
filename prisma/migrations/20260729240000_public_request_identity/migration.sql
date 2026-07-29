ALTER TABLE "mini_app_requests"
  ALTER COLUMN "applicant_user_id" DROP NOT NULL,
  ADD COLUMN "applicant_name" VARCHAR(160),
  ADD COLUMN "telegram_username" VARCHAR(64),
  ADD COLUMN "request_origin" VARCHAR(16) NOT NULL DEFAULT 'WEB',
  ADD COLUMN "status_access_token_hash" VARCHAR(64);

ALTER TABLE "admin_audit_logs"
  ALTER COLUMN "actor_user_id" DROP NOT NULL;

UPDATE "mini_app_requests" r
SET
  "applicant_name" = COALESCE(NULLIF(TRIM(CONCAT(u."first_name", ' ', COALESCE(u."last_name", ''))), ''), 'Existing applicant'),
  "telegram_username" = u."username",
  "request_origin" = 'TELEGRAM',
  "status_access_token_hash" = encode(sha256(convert_to(r."id" || clock_timestamp()::text, 'UTF8')), 'hex')
FROM "users" u
WHERE r."applicant_user_id" = u."id";

UPDATE "mini_app_requests"
SET
  "applicant_name" = COALESCE("applicant_name", 'Existing applicant'),
  "status_access_token_hash" = COALESCE("status_access_token_hash", encode(sha256(convert_to("id" || clock_timestamp()::text, 'UTF8')), 'hex')),
  "device_identifier_hash" = COALESCE("device_identifier_hash", encode(sha256(convert_to("id" || ':legacy-device', 'UTF8')), 'hex'));

ALTER TABLE "mini_app_requests"
  ALTER COLUMN "applicant_name" SET NOT NULL,
  ALTER COLUMN "device_identifier_hash" SET NOT NULL,
  ALTER COLUMN "status_access_token_hash" SET NOT NULL;
