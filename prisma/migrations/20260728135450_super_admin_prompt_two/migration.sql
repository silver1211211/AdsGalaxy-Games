-- AlterTable
ALTER TABLE "platform_integration_settings" ADD COLUMN     "ads_galaxy_emergency_disabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "oxapay_automatic_disabled_reason" VARCHAR(300);

-- CreateTable
CREATE TABLE "platform_configuration" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "display_name" VARCHAR(100) NOT NULL DEFAULT 'Ads Galaxy',
    "primary_public_url" TEXT,
    "support_url" TEXT,
    "support_username" VARCHAR(64),
    "privacy_url" TEXT,
    "terms_url" TEXT,
    "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
    "maintenance_message" VARCHAR(500),
    "registration_enabled" BOOLEAN NOT NULL DEFAULT true,
    "new_tenant_defaults" JSONB NOT NULL DEFAULT '{}',
    "updated_by_super_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_platform_defaults" (
    "id" TEXT NOT NULL,
    "game_key" VARCHAR(40) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "emergency_disabled" BOOLEAN NOT NULL DEFAULT false,
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_platform_defaults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_tenant_overrides" (
    "id" TEXT NOT NULL,
    "default_id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "configuration" JSONB NOT NULL,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_tenant_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsored_campaigns" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "sponsor_name" VARCHAR(120) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "image_reference" TEXT,
    "button_text" VARCHAR(50) NOT NULL,
    "destination_url" TEXT NOT NULL,
    "disclosure_text" VARCHAR(40) NOT NULL DEFAULT 'Sponsored',
    "background_style" VARCHAR(20) NOT NULL DEFAULT 'TEAL',
    "placement" VARCHAR(40) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "targeting_mode" VARCHAR(24) NOT NULL DEFAULT 'ALL_TENANTS',
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "max_impressions" INTEGER,
    "max_clicks" INTEGER,
    "per_user_frequency" INTEGER NOT NULL DEFAULT 1,
    "created_by_user_id" TEXT NOT NULL,
    "updated_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsored_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsored_campaign_tenants" (
    "campaign_id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,

    CONSTRAINT "sponsored_campaign_tenants_pkey" PRIMARY KEY ("campaign_id","mini_app_id")
);

-- CreateTable
CREATE TABLE "sponsored_campaign_events" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_type" VARCHAR(16) NOT NULL,
    "session_reference" VARCHAR(100) NOT NULL,
    "deduplication_key" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsored_campaign_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_alert_rules" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "threshold" INTEGER NOT NULL,
    "window_minutes" INTEGER NOT NULL,
    "severity" VARCHAR(16) NOT NULL,
    "last_triggered_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_alerts" (
    "id" TEXT NOT NULL,
    "rule_id" TEXT,
    "mini_app_id" TEXT,
    "type" VARCHAR(64) NOT NULL,
    "severity" VARCHAR(16) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    "title" VARCHAR(160) NOT NULL,
    "summary" VARCHAR(500) NOT NULL,
    "first_detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_by_id" TEXT,
    "resolved_by_id" TEXT,

    CONSTRAINT "platform_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_platform_defaults_game_key_key" ON "game_platform_defaults"("game_key");

-- CreateIndex
CREATE INDEX "game_tenant_overrides_mini_app_id_idx" ON "game_tenant_overrides"("mini_app_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_tenant_overrides_default_id_mini_app_id_key" ON "game_tenant_overrides"("default_id", "mini_app_id");

-- CreateIndex
CREATE INDEX "sponsored_campaigns_status_placement_starts_at_ends_at_idx" ON "sponsored_campaigns"("status", "placement", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "sponsored_campaign_tenants_mini_app_id_idx" ON "sponsored_campaign_tenants"("mini_app_id");

-- CreateIndex
CREATE UNIQUE INDEX "sponsored_campaign_events_deduplication_key_key" ON "sponsored_campaign_events"("deduplication_key");

-- CreateIndex
CREATE INDEX "sponsored_campaign_events_campaign_id_event_type_created_at_idx" ON "sponsored_campaign_events"("campaign_id", "event_type", "created_at");

-- CreateIndex
CREATE INDEX "sponsored_campaign_events_mini_app_id_created_at_idx" ON "sponsored_campaign_events"("mini_app_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "platform_alert_rules_type_key" ON "platform_alert_rules"("type");

-- CreateIndex
CREATE INDEX "platform_alerts_status_severity_last_detected_at_idx" ON "platform_alerts"("status", "severity", "last_detected_at");

-- CreateIndex
CREATE INDEX "platform_alerts_mini_app_id_status_idx" ON "platform_alerts"("mini_app_id", "status");

-- AddForeignKey
ALTER TABLE "game_tenant_overrides" ADD CONSTRAINT "game_tenant_overrides_default_id_fkey" FOREIGN KEY ("default_id") REFERENCES "game_platform_defaults"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_tenant_overrides" ADD CONSTRAINT "game_tenant_overrides_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsored_campaign_tenants" ADD CONSTRAINT "sponsored_campaign_tenants_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "sponsored_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsored_campaign_tenants" ADD CONSTRAINT "sponsored_campaign_tenants_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsored_campaign_events" ADD CONSTRAINT "sponsored_campaign_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "sponsored_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsored_campaign_events" ADD CONSTRAINT "sponsored_campaign_events_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_alerts" ADD CONSTRAINT "platform_alerts_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "platform_alert_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_alerts" ADD CONSTRAINT "platform_alerts_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
