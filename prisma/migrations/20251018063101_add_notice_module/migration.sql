-- CreateEnum
CREATE TYPE "public"."NoticeType" AS ENUM ('GENERAL', 'EVENT', 'MAINTENANCE', 'POLICY', 'RECRUITMENT');

-- CreateTable
CREATE TABLE "public"."Notice" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "public"."NoticeType" NOT NULL DEFAULT 'GENERAL',
    "isFixed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NoticeAttachment" (
    "id" TEXT NOT NULL,
    "noticeId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoticeAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notice_isFixed_createdAt_idx" ON "public"."Notice"("isFixed", "createdAt");

-- CreateIndex
CREATE INDEX "NoticeAttachment_noticeId_idx" ON "public"."NoticeAttachment"("noticeId");

-- AddForeignKey
ALTER TABLE "public"."NoticeAttachment" ADD CONSTRAINT "NoticeAttachment_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "public"."Notice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
