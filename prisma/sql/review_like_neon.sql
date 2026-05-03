-- Analiz beğenisi ara tablosu + Match.likeCount kaldırma (Neon / PostgreSQL)

ALTER TABLE "Match" DROP COLUMN IF EXISTS "likeCount";

CREATE TABLE IF NOT EXISTS "ReviewLike" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "actorKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReviewLike_reviewId_actorKey_key" ON "ReviewLike"("reviewId", "actorKey");

CREATE INDEX IF NOT EXISTS "ReviewLike_reviewId_idx" ON "ReviewLike"("reviewId");

ALTER TABLE "ReviewLike" DROP CONSTRAINT IF EXISTS "ReviewLike_reviewId_fkey";

ALTER TABLE "ReviewLike"
  ADD CONSTRAINT "ReviewLike_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
