/*
  Warnings:

  - You are about to drop the column `networkId` on the `ActiveVoiceSession` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[instanceId,playerUuid]` on the table `ActiveVoiceSession` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `instanceId` to the `ActiveVoiceSession` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ActiveVoiceSession" DROP CONSTRAINT "ActiveVoiceSession_networkId_fkey";

-- DropIndex
DROP INDEX "ActiveVoiceSession_networkId_playerUuid_key";

-- AlterTable
ALTER TABLE "ActiveVoiceSession" DROP COLUMN "networkId",
ADD COLUMN     "instanceId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ActiveVoiceSession_instanceId_playerUuid_key" ON "ActiveVoiceSession"("instanceId", "playerUuid");

-- AddForeignKey
ALTER TABLE "ActiveVoiceSession" ADD CONSTRAINT "ActiveVoiceSession_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Network"("id") ON DELETE CASCADE ON UPDATE CASCADE;
