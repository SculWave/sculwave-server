ALTER TABLE "Network"
ADD COLUMN "nameNormalized" TEXT;

UPDATE "Network"
SET "nameNormalized" = LOWER(
  REGEXP_REPLACE(
    BTRIM(name),
    '\s+',
    ' ',
    'g'
  )
)
WHERE "nameNormalized" IS NULL;

ALTER TABLE "Network"
ALTER COLUMN "nameNormalized" SET NOT NULL;

CREATE UNIQUE INDEX "Network_nameNormalized_key"
ON "Network"("nameNormalized");
