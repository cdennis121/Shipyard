-- Add appId column (nullable initially)
ALTER TABLE "ApiKey" ADD COLUMN "appId" TEXT;

-- Migrate existing API keys: set appId based on the release's appId
UPDATE "ApiKey" 
SET "appId" = (
  SELECT "appId" FROM "Release" WHERE "Release"."id" = "ApiKey"."releaseId"
)
WHERE "releaseId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT IF EXISTS "ApiKey_releaseId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "ApiKey_releaseId_idx";

-- Remove releaseId column
ALTER TABLE "ApiKey" DROP COLUMN IF EXISTS "releaseId";

-- Make appId required after data migration
ALTER TABLE "ApiKey" ALTER COLUMN "appId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ApiKey_appId_idx" ON "ApiKey"("appId");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
