CREATE TABLE "tenant_admin_settings" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "description" VARCHAR(500),
    "logo_url" TEXT,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "support_username" VARCHAR(64),
    "support_url" TEXT,
    "terms_url" TEXT,
    "privacy_url" TEXT,
    "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
    "maintenance_message" VARCHAR(300),
    "security_alerts_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenant_admin_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_bot_configurations" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "token_encrypted" TEXT NOT NULL,
    "token_masked" VARCHAR(32) NOT NULL,
    "bot_id" VARCHAR(32),
    "bot_username" VARCHAR(64),
    "validation_status" VARCHAR(32) NOT NULL DEFAULT 'VALIDATED',
    "configured_by_user_id" TEXT NOT NULL,
    "configured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_bot_configurations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_admin_notifications" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "severity" VARCHAR(16) NOT NULL DEFAULT 'INFO',
    "data" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_admin_notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_admin_settings_mini_app_id_key" ON "tenant_admin_settings"("mini_app_id");
CREATE UNIQUE INDEX "tenant_bot_configurations_mini_app_id_key" ON "tenant_bot_configurations"("mini_app_id");
CREATE INDEX "tenant_admin_notifications_mini_app_id_read_at_created_at_idx"
ON "tenant_admin_notifications"("mini_app_id", "read_at", "created_at");

ALTER TABLE "tenant_admin_settings" ADD CONSTRAINT "tenant_admin_settings_mini_app_id_fkey"
FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_bot_configurations" ADD CONSTRAINT "tenant_bot_configurations_mini_app_id_fkey"
FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_admin_notifications" ADD CONSTRAINT "tenant_admin_notifications_mini_app_id_fkey"
FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
