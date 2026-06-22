CREATE TYPE "PermissionLevel" AS ENUM ('administrator', 'user');

ALTER TABLE "users"
  ADD COLUMN "password_hash" TEXT,
  ADD COLUMN "permission_level" "PermissionLevel" NOT NULL DEFAULT 'user',
  ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "last_login_at" TIMESTAMP(3),
  ADD COLUMN "deactivated_at" TIMESTAMP(3);

CREATE INDEX "users_permission_level_idx" ON "users"("permission_level");
