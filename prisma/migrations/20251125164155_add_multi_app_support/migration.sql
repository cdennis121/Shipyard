/*
  Warnings:

  - A unique constraint covering the columns `[appId,version,channel,platform]` on the table `Release` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `appId` to the `Release` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Release_channel_platform_published_idx";

-- DropIndex
DROP INDEX "Release_version_channel_platform_key";

-- AlterTable
ALTER TABLE "DownloadStat" ADD COLUMN     "appId" TEXT;

-- AlterTable
ALTER TABLE "Release" ADD COLUMN     "appId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "App" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "App_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "App_slug_key" ON "App"("slug");

-- CreateIndex
CREATE INDEX "App_slug_idx" ON "App"("slug");

-- CreateIndex
CREATE INDEX "DownloadStat_appId_idx" ON "DownloadStat"("appId");

-- CreateIndex
CREATE INDEX "Release_appId_channel_platform_published_idx" ON "Release"("appId", "channel", "platform", "published");

-- CreateIndex
CREATE UNIQUE INDEX "Release_appId_version_channel_platform_key" ON "Release"("appId", "version", "channel", "platform");

-- AddForeignKey
ALTER TABLE "App" ADD CONSTRAINT "App_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Release" ADD CONSTRAINT "Release_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadStat" ADD CONSTRAINT "DownloadStat_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE SET NULL ON UPDATE CASCADE;
