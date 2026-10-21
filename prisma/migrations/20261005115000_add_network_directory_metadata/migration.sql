CREATE TYPE "NetworkPlatformSupport" AS ENUM (
    'JAVA_ONLY',
    'BEDROCK_ONLY',
    'JAVA_AND_BEDROCK'
);

ALTER TABLE "Network"
ADD COLUMN "platformSupport" "NetworkPlatformSupport" NOT NULL DEFAULT 'JAVA_ONLY',
ADD COLUMN "javaAddress" TEXT,
ADD COLUMN "bedrockAddress" TEXT,
ADD COLUMN "gameVersion" TEXT,
ADD COLUMN "region" TEXT,
ADD COLUMN "websiteUrl" TEXT,
ADD COLUMN "discordUrl" TEXT;
