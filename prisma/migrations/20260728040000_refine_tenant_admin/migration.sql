ALTER TABLE "tenant_admin_settings"
ADD COLUMN "start_message" VARCHAR(4000),
ADD COLUMN "start_image_key" VARCHAR(255),
ADD COLUMN "start_image_data" BYTEA,
ADD COLUMN "start_image_mime" VARCHAR(32),
ADD COLUMN "mini_app_button_text" VARCHAR(40) NOT NULL DEFAULT 'Open Mini App',
ADD COLUMN "inline_buttons" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "mini_app_memberships"
ADD COLUMN "banned_by_id" TEXT,
ADD COLUMN "banned_at" TIMESTAMP(3),
ADD COLUMN "ban_reason" VARCHAR(300),
ADD COLUMN "unbanned_by_id" TEXT,
ADD COLUMN "unbanned_at" TIMESTAMP(3);

CREATE INDEX "mini_app_memberships_mini_app_id_status_idx"
ON "mini_app_memberships"("mini_app_id", "status");
