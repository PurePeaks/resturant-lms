-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');

-- DropIndex
DROP INDEX "Certificate_userId_moduleId_key";

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "anonymizedAt" TIMESTAMP(3),
ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "durationSeconds" DOUBLE PRECISION,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "quizVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "validityMonths" INTEGER DEFAULT 12;

-- AlterTable
ALTER TABLE "WatchProgress" ADD COLUMN     "maxWatchedSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "segmentStartSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "segmentStartedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "quizVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "voidedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "quizVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "revokedReason" TEXT,
ADD COLUMN     "score" DOUBLE PRECISION,
ADD COLUMN     "verificationCode" TEXT NOT NULL DEFAULT upper(substr(replace((gen_random_uuid())::text, '-'::text, ''::text), 1, 16));

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "actorRole" TEXT,
    "tenantId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "summary" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "purpose" TEXT,
    "kitType" TEXT,
    "city" TEXT,
    "notes" TEXT,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RateLimit_resetAt_idx" ON "RateLimit"("resetAt");

-- CreateIndex
CREATE UNIQUE INDEX "Inquiry_referenceCode_key" ON "Inquiry"("referenceCode");

-- CreateIndex
CREATE INDEX "Inquiry_status_createdAt_idx" ON "Inquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "QuizAttempt_userId_moduleId_createdAt_idx" ON "QuizAttempt"("userId", "moduleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_verificationCode_key" ON "Certificate"("verificationCode");

-- CreateIndex
CREATE INDEX "Certificate_userId_moduleId_idx" ON "Certificate"("userId", "moduleId");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Data backfill ───────────────────────────────────────────────────────────

-- Modules that existed before drafts were introduced stay visible to staff.
UPDATE "Module" SET "publishedAt" = "createdAt" WHERE "publishedAt" IS NULL;

-- The old schema stored the high-water mark in "watchedSeconds".
UPDATE "WatchProgress" SET "maxWatchedSeconds" = "watchedSeconds";

-- Record the best passing score on existing certificates.
UPDATE "Certificate" c SET "score" = (
  SELECT MAX(q."score") FROM "QuizAttempt" q
  WHERE q."userId" = c."userId" AND q."moduleId" = c."moduleId" AND q."passed" = true
);

-- Certificate links now use the unguessable verification code.
UPDATE "Certificate" SET "pdfUrl" = '/certificates/' || "verificationCode";

-- Emails are stored lowercase. Rows whose lowercase form would collide with
-- another account are left alone (sign-in still matches case-insensitively).
UPDATE "User" u SET "email" = lower(trim(u."email"))
WHERE u."email" <> lower(trim(u."email"))
  AND NOT EXISTS (
    SELECT 1 FROM "User" o WHERE o."id" <> u."id" AND o."email" = lower(trim(u."email"))
  );
