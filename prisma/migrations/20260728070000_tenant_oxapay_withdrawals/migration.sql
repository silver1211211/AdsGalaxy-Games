CREATE TYPE "WithdrawalProcessingMode" AS ENUM ('MANUAL', 'OXAPAY_AUTOMATIC');
CREATE TYPE "PayoutProvider" AS ENUM ('OXAPAY');
CREATE TYPE "ProviderPayoutStatus" AS ENUM ('NOT_SUBMITTED', 'SUBMITTING', 'PENDING', 'PROCESSING', 'CONFIRMING', 'CONFIRMED', 'REJECTED', 'CANCELED', 'UNKNOWN');

ALTER TABLE "wallet_payout_methods"
  ADD COLUMN "automatic_eligible" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "catalog_network_id" TEXT,
  ADD COLUMN "currency_symbol" VARCHAR(16),
  ADD COLUMN "network_code" VARCHAR(64),
  ADD COLUMN "provider" "PayoutProvider" DEFAULT 'OXAPAY';

ALTER TABLE "wallet_settings"
  ADD COLUMN "withdrawal_processing_mode" "WithdrawalProcessingMode" NOT NULL DEFAULT 'MANUAL';

ALTER TABLE "withdrawals"
  ADD COLUMN "gross_crypto_amount" DECIMAL(36,18),
  ADD COLUMN "memo_encrypted" TEXT,
  ADD COLUMN "net_crypto_amount" DECIMAL(36,18),
  ADD COLUMN "payout_currency" VARCHAR(16),
  ADD COLUMN "payout_network" VARCHAR(64),
  ADD COLUMN "platform_fee" DECIMAL(18,6),
  ADD COLUMN "pricing_source" VARCHAR(64),
  ADD COLUMN "processing_mode" "WithdrawalProcessingMode" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "provider_fee" DECIMAL(36,18),
  ADD COLUMN "provider_status" "ProviderPayoutStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
  ADD COLUMN "quote_timestamp" TIMESTAMP(3),
  ADD COLUMN "quoted_exchange_rate" DECIMAL(36,18),
  ADD COLUMN "requested_wallet_value" DECIMAL(18,6);

CREATE TABLE "tenant_oxapay_credentials" (
  "id" TEXT NOT NULL,
  "mini_app_id" TEXT NOT NULL,
  "payout_api_key_encrypted" TEXT NOT NULL,
  "payout_api_key_masked" VARCHAR(32) NOT NULL,
  "callback_key" VARCHAR(64) NOT NULL,
  "configured_by_user_id" TEXT NOT NULL,
  "configured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_successful_verification" TIMESTAMP(3),
  "last_failed_verification" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenant_oxapay_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "oxapay_currencies" (
  "id" TEXT NOT NULL,
  "symbol" VARCHAR(16) NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "source_version" VARCHAR(32),
  "raw_metadata" JSONB,
  "synchronized_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "oxapay_currencies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "oxapay_currency_networks" (
  "id" TEXT NOT NULL,
  "currency_id" TEXT NOT NULL,
  "network_code" VARCHAR(64) NOT NULL,
  "network_name" VARCHAR(100) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "withdrawal_minimum" DECIMAL(36,18) NOT NULL,
  "withdrawal_fee" DECIMAL(36,18) NOT NULL,
  "required_confirmations" INTEGER,
  "memo_supported" BOOLEAN NOT NULL DEFAULT false,
  "raw_metadata" JSONB,
  "synchronized_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "oxapay_currency_networks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "oxapay_payout_attempts" (
  "id" TEXT NOT NULL,
  "mini_app_id" TEXT NOT NULL,
  "withdrawal_id" TEXT NOT NULL,
  "submission_key" TEXT NOT NULL,
  "track_id" VARCHAR(160),
  "provider_status" "ProviderPayoutStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
  "request_fingerprint" VARCHAR(64) NOT NULL,
  "submitted_at" TIMESTAMP(3),
  "last_checked_at" TIMESTAMP(3),
  "finalized_at" TIMESTAMP(3),
  "failure_code" VARCHAR(64),
  "callback_digests" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "oxapay_payout_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_integration_settings" (
  "id" TEXT NOT NULL DEFAULT 'platform',
  "oxapay_signup_url" TEXT,
  "oxapay_signup_label" VARCHAR(80) NOT NULL DEFAULT 'Sign up HERE',
  "oxapay_help_text" VARCHAR(500),
  "oxapay_signup_enabled" BOOLEAN NOT NULL DEFAULT false,
  "oxapay_automatic_disabled" BOOLEAN NOT NULL DEFAULT false,
  "oxapay_catalog_synchronized_at" TIMESTAMP(3),
  "updated_by_super_admin_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_integration_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_oxapay_credentials_mini_app_id_key" ON "tenant_oxapay_credentials"("mini_app_id");
CREATE UNIQUE INDEX "tenant_oxapay_credentials_callback_key_key" ON "tenant_oxapay_credentials"("callback_key");
CREATE UNIQUE INDEX "oxapay_currencies_symbol_key" ON "oxapay_currencies"("symbol");
CREATE INDEX "oxapay_currency_networks_is_active_synchronized_at_idx" ON "oxapay_currency_networks"("is_active", "synchronized_at");
CREATE UNIQUE INDEX "oxapay_currency_networks_currency_id_network_code_key" ON "oxapay_currency_networks"("currency_id", "network_code");
CREATE UNIQUE INDEX "oxapay_payout_attempts_withdrawal_id_key" ON "oxapay_payout_attempts"("withdrawal_id");
CREATE UNIQUE INDEX "oxapay_payout_attempts_submission_key_key" ON "oxapay_payout_attempts"("submission_key");
CREATE UNIQUE INDEX "oxapay_payout_attempts_track_id_key" ON "oxapay_payout_attempts"("track_id");
CREATE INDEX "oxapay_payout_attempts_mini_app_id_provider_status_created__idx" ON "oxapay_payout_attempts"("mini_app_id", "provider_status", "created_at");
CREATE UNIQUE INDEX "wallet_payout_methods_mini_app_id_provider_currency_symbol__key" ON "wallet_payout_methods"("mini_app_id", "provider", "currency_symbol", "network_code");

ALTER TABLE "wallet_payout_methods" ADD CONSTRAINT "wallet_payout_methods_catalog_network_id_fkey" FOREIGN KEY ("catalog_network_id") REFERENCES "oxapay_currency_networks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tenant_oxapay_credentials" ADD CONSTRAINT "tenant_oxapay_credentials_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "oxapay_currency_networks" ADD CONSTRAINT "oxapay_currency_networks_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "oxapay_currencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "oxapay_payout_attempts" ADD CONSTRAINT "oxapay_payout_attempts_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "oxapay_payout_attempts" ADD CONSTRAINT "oxapay_payout_attempts_withdrawal_id_fkey" FOREIGN KEY ("withdrawal_id") REFERENCES "withdrawals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
