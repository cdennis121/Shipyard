-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- Seed a default tenant for existing single-tenant installs
INSERT INTO "Tenant" ("id", "name", "slug", "createdAt", "updatedAt")
VALUES ('tenant_default', 'Shipyard', 'shipyard', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "App" ADD COLUMN "tenantId" TEXT;

-- Backfill existing records into the default tenant
UPDATE "User"
SET "tenantId" = 'tenant_default',
    "role" = CASE WHEN "role" = 'admin' THEN 'platform_admin' ELSE "role" END
WHERE "tenantId" IS NULL;

UPDATE "App"
SET "tenantId" = 'tenant_default'
WHERE "tenantId" IS NULL;

-- Enforce tenant ownership
ALTER TABLE "User" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "App" ALTER COLUMN "tenantId" SET NOT NULL;

-- Replace global username uniqueness with tenant-scoped uniqueness
DROP INDEX "User_username_key";
CREATE UNIQUE INDEX "User_tenantId_username_key" ON "User"("tenantId", "username");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");
CREATE INDEX "App_tenantId_idx" ON "App"("tenantId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "App" ADD CONSTRAINT "App_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
