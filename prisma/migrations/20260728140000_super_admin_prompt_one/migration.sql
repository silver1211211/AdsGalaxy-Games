ALTER TABLE "users"
ADD COLUMN "super_admin_theme" VARCHAR(8) NOT NULL DEFAULT 'LIGHT';

CREATE TABLE "super_admin_user_notes" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "author_user_id" TEXT NOT NULL,
  "body" VARCHAR(1000) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "super_admin_user_notes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "super_admin_user_notes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "super_admin_user_notes_author_user_id_fkey"
    FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "super_admin_user_notes_user_id_created_at_idx"
ON "super_admin_user_notes"("user_id", "created_at");

CREATE INDEX "super_admin_user_notes_author_user_id_created_at_idx"
ON "super_admin_user_notes"("author_user_id", "created_at");
