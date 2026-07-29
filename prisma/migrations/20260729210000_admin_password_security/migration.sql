CREATE TYPE "AdminCredentialScope" AS ENUM ('TENANT_ADMIN', 'SUPER_ADMIN');

ALTER TABLE "mini_app_requests"
  ADD COLUMN "admin_credential_issued_at" TIMESTAMP(3),
  ADD COLUMN "admin_credential_revealed_at" TIMESTAMP(3);

CREATE TABLE "admin_credentials" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "scope_type" "AdminCredentialScope" NOT NULL,
  "password_hash" TEXT NOT NULL,
  "password_changed_at" TIMESTAMP(3),
  "temporary_password" BOOLEAN NOT NULL DEFAULT true,
  "must_change_password" BOOLEAN NOT NULL DEFAULT true,
  "failed_attempt_count" INTEGER NOT NULL DEFAULT 0,
  "failed_window_started_at" TIMESTAMP(3),
  "locked_until" TIMESTAMP(3),
  "last_verified_at" TIMESTAMP(3),
  "last_successful_login_at" TIMESTAMP(3),
  "last_failed_login_at" TIMESTAMP(3),
  "reset_by_user_id" TEXT,
  "reset_at" TIMESTAMP(3),
  "credential_version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "admin_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_elevation_sessions" (
  "id" TEXT NOT NULL,
  "token_hash" VARCHAR(64) NOT NULL,
  "user_id" TEXT NOT NULL,
  "credential_id" TEXT NOT NULL,
  "mini_app_id" TEXT,
  "scope_type" "AdminCredentialScope" NOT NULL,
  "credential_version" INTEGER NOT NULL,
  "verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_elevation_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_credentials_user_id_scope_type_key"
  ON "admin_credentials"("user_id", "scope_type");
CREATE INDEX "admin_credentials_scope_type_locked_until_idx"
  ON "admin_credentials"("scope_type", "locked_until");
CREATE UNIQUE INDEX "admin_elevation_sessions_token_hash_key"
  ON "admin_elevation_sessions"("token_hash");
CREATE INDEX "admin_elevation_sessions_user_id_scope_type_mini_app_id_revoked_at_expires_at_idx"
  ON "admin_elevation_sessions"("user_id", "scope_type", "mini_app_id", "revoked_at", "expires_at");
CREATE INDEX "admin_elevation_sessions_credential_id_credential_version_idx"
  ON "admin_elevation_sessions"("credential_id", "credential_version");

ALTER TABLE "admin_credentials"
  ADD CONSTRAINT "admin_credentials_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admin_credentials"
  ADD CONSTRAINT "admin_credentials_reset_by_user_id_fkey"
  FOREIGN KEY ("reset_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "admin_elevation_sessions"
  ADD CONSTRAINT "admin_elevation_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admin_elevation_sessions"
  ADD CONSTRAINT "admin_elevation_sessions_credential_id_fkey"
  FOREIGN KEY ("credential_id") REFERENCES "admin_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admin_elevation_sessions"
  ADD CONSTRAINT "admin_elevation_sessions_mini_app_id_fkey"
  FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
