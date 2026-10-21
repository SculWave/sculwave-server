-- AlterTable
ALTER TABLE "Network"
ADD COLUMN "description" TEXT,
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "publicListed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Backend"
ADD COLUMN "entryPoint" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "entryPointPriority" INTEGER;
