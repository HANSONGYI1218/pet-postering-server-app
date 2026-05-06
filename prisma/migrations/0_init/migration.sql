-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ORG_ADMIN');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "AnimalStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AnimalType" AS ENUM ('DOG', 'CAT');

-- CreateEnum
CREATE TYPE "AnimalGender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "AnimalSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "AnimalAge" AS ENUM ('JUVENILE', 'ADULT', 'SENIOR');

-- CreateEnum
CREATE TYPE "AnimalHealthTagType" AS ENUM ('NEUTERED', 'VACCINATED', 'MICROCHIPPED', 'HEARTWORM_TESTED', 'DEWORMED', 'FLEA_TICK_TREATED');

-- CreateEnum
CREATE TYPE "AnimalPersonalityTagType" AS ENUM ('QUIET', 'ENERGETIC', 'INDEPENDENCE', 'SENSITIVITY', 'FRIENDLY_WITH_PEOPLE', 'GOOD_WITH_OTHER_ANIMAL', 'POTTY_TRAINING_COMPLETION', 'NO_BITING');

-- CreateEnum
CREATE TYPE "AnimalEnvironmentTagType" AS ENUM ('QUIET_ENVIRONMENT', 'AVAILABILITY_FOR_WALKS_PLAY', 'FREQUENT_INTERACTION_WITH_PETS', 'PRESENCE_OF_OTHER_ANIMAL', 'WILLINGNESS_FOR_POTTY_TRAINING', 'PATIENCE_WITH_BARKING_BITING', 'CARE_FOR_SENSITIVE_OR_FEARFUL_PETS', 'HOUSEHOLD_WITH_YOUNG_CHILDREN');

-- CreateEnum
CREATE TYPE "AnimalSpecialNoteTagType" AS ENUM ('SEPARATION_ANXIETY', 'MEDICATION_REQUIRED', 'POTTY_ACCIDENTS', 'AGGRESSION_TOWARD_OTHER_ANIMALS', 'ONGOING_TREATMENT_OR_RECOVERY', 'DISABLED_OR_ILL_PETS_ACCEPTED');

-- CreateEnum
CREATE TYPE "NoticeType" AS ENUM ('GENERAL', 'EVENT', 'MAINTENANCE', 'POLICY', 'RECRUITMENT');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('POST', 'COMMENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "kakaoId" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phoneNumber" TEXT,
    "zipcode" TEXT,
    "address" TEXT,
    "addressDetail" TEXT,
    "introduction" TEXT,
    "isEligibleForFoster" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserNotificationSetting" (
    "userId" TEXT NOT NULL,
    "commentEmail" BOOLEAN NOT NULL DEFAULT true,
    "fosterAnimalInfoEmail" BOOLEAN NOT NULL DEFAULT true,
    "fosterAnimalInfoKakao" BOOLEAN NOT NULL DEFAULT true,
    "marketingEmail" BOOLEAN NOT NULL DEFAULT false,
    "marketingKakao" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserNotificationSetting_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "FosterCondition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferredTypes" "AnimalType"[] DEFAULT ARRAY[]::"AnimalType"[],
    "preferredSizes" "AnimalSize"[] DEFAULT ARRAY[]::"AnimalSize"[],
    "preferredAges" "AnimalAge"[] DEFAULT ARRAY[]::"AnimalAge"[],
    "fosterEnvironmentsTags" "AnimalEnvironmentTagType"[] DEFAULT ARRAY[]::"AnimalEnvironmentTagType"[],
    "fosterPersonalityTags" "AnimalPersonalityTagType"[] DEFAULT ARRAY[]::"AnimalPersonalityTagType"[],
    "fosterPeriod" TEXT,
    "fosterHealthTags" "AnimalHealthTagType"[] DEFAULT ARRAY[]::"AnimalHealthTagType"[],
    "fosterSpecialNoteTags" "AnimalSpecialNoteTagType"[] DEFAULT ARRAY[]::"AnimalSpecialNoteTagType"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FosterCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FosterExperience" (
    "id" TEXT NOT NULL,
    "fosterConditionId" TEXT NOT NULL,
    "animalType" "AnimalType",
    "animalSize" "AnimalSize",
    "animalAge" "AnimalAge",
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "organizationName" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FosterExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zipcode" TEXT,
    "address" TEXT,
    "addressDetail" TEXT,
    "phoneNumber" TEXT,
    "donationBankName" TEXT,
    "donationAccountNumber" TEXT,
    "donationAccountHolder" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("userId","organizationId")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostBookmark" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostBookmark_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "PostLike" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostLike_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "CommentLike" (
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentLike_pkey" PRIMARY KEY ("userId","commentId")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notice" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "NoticeType" NOT NULL DEFAULT 'GENERAL',
    "isFixed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoticeAttachment" (
    "id" TEXT NOT NULL,
    "noticeId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoticeAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Animal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "AnimalStatus" NOT NULL DEFAULT 'WAITING',
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "orgId" TEXT,
    "ownerUserId" TEXT,
    "type" "AnimalType",
    "size" "AnimalSize",
    "gender" "AnimalGender",
    "age" TEXT,
    "breed" TEXT,
    "birthDate" TIMESTAMP(3),
    "mainImageUrl" TEXT,
    "introduction" TEXT,
    "remark" TEXT,
    "emergency" BOOLEAN NOT NULL DEFAULT false,
    "emergencyReason" TEXT,
    "currentFosterStartDate" TIMESTAMP(3),
    "currentFosterEndDate" TIMESTAMP(3),
    "euthanasiaDate" TIMESTAMP(3),
    "isFosterCondition" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Animal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimalImage" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimalImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimalHealthTag" (
    "animalId" TEXT NOT NULL,
    "value" "AnimalHealthTagType" NOT NULL,

    CONSTRAINT "AnimalHealthTag_pkey" PRIMARY KEY ("animalId","value")
);

-- CreateTable
CREATE TABLE "AnimalPersonalityTag" (
    "animalId" TEXT NOT NULL,
    "value" "AnimalPersonalityTagType" NOT NULL,

    CONSTRAINT "AnimalPersonalityTag_pkey" PRIMARY KEY ("animalId","value")
);

-- CreateTable
CREATE TABLE "AnimalEnvironmentTag" (
    "animalId" TEXT NOT NULL,
    "value" "AnimalEnvironmentTagType" NOT NULL,

    CONSTRAINT "AnimalEnvironmentTag_pkey" PRIMARY KEY ("animalId","value")
);

-- CreateTable
CREATE TABLE "AnimalSpecialNoteTag" (
    "animalId" TEXT NOT NULL,
    "value" "AnimalSpecialNoteTagType" NOT NULL,

    CONSTRAINT "AnimalSpecialNoteTag_pkey" PRIMARY KEY ("animalId","value")
);

-- CreateTable
CREATE TABLE "FosterRecord" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "content" TEXT,
    "healthNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FosterRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FosterRecordImage" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FosterRecordImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FosterApplication" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "userId" TEXT,
    "applicantName" TEXT NOT NULL,
    "email" TEXT,
    "phoneNumber" TEXT,
    "address" TEXT,
    "addressDetail" TEXT,
    "introduction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FosterApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_kakaoId_key" ON "User"("kakaoId");

-- CreateIndex
CREATE UNIQUE INDEX "FosterCondition_userId_key" ON "FosterCondition"("userId");

-- CreateIndex
CREATE INDEX "FosterExperience_fosterConditionId_idx" ON "FosterExperience"("fosterConditionId");

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");

-- CreateIndex
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "PostBookmark_postId_idx" ON "PostBookmark"("postId");

-- CreateIndex
CREATE INDEX "PostLike_postId_idx" ON "PostLike"("postId");

-- CreateIndex
CREATE INDEX "CommentLike_commentId_idx" ON "CommentLike"("commentId");

-- CreateIndex
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Notice_isFixed_createdAt_idx" ON "Notice"("isFixed", "createdAt");

-- CreateIndex
CREATE INDEX "NoticeAttachment_noticeId_idx" ON "NoticeAttachment"("noticeId");

-- CreateIndex
CREATE INDEX "Animal_status_idx" ON "Animal"("status");

-- CreateIndex
CREATE INDEX "Animal_orgId_idx" ON "Animal"("orgId");

-- CreateIndex
CREATE INDEX "Animal_ownerUserId_idx" ON "Animal"("ownerUserId");

-- CreateIndex
CREATE INDEX "AnimalImage_animalId_idx" ON "AnimalImage"("animalId");

-- CreateIndex
CREATE UNIQUE INDEX "AnimalImage_animalId_sortOrder_key" ON "AnimalImage"("animalId", "sortOrder");

-- CreateIndex
CREATE INDEX "FosterRecord_animalId_date_idx" ON "FosterRecord"("animalId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "FosterRecord_animalId_date_key" ON "FosterRecord"("animalId", "date");

-- CreateIndex
CREATE INDEX "FosterRecordImage_recordId_idx" ON "FosterRecordImage"("recordId");

-- CreateIndex
CREATE UNIQUE INDEX "FosterRecordImage_recordId_sortOrder_key" ON "FosterRecordImage"("recordId", "sortOrder");

-- CreateIndex
CREATE INDEX "FosterApplication_animalId_idx" ON "FosterApplication"("animalId");

-- CreateIndex
CREATE INDEX "FosterApplication_userId_idx" ON "FosterApplication"("userId");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotificationSetting" ADD CONSTRAINT "UserNotificationSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FosterCondition" ADD CONSTRAINT "FosterCondition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FosterExperience" ADD CONSTRAINT "FosterExperience_fosterConditionId_fkey" FOREIGN KEY ("fosterConditionId") REFERENCES "FosterCondition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostBookmark" ADD CONSTRAINT "PostBookmark_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostBookmark" ADD CONSTRAINT "PostBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeAttachment" ADD CONSTRAINT "NoticeAttachment_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalImage" ADD CONSTRAINT "AnimalImage_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalHealthTag" ADD CONSTRAINT "AnimalHealthTag_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalPersonalityTag" ADD CONSTRAINT "AnimalPersonalityTag_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalEnvironmentTag" ADD CONSTRAINT "AnimalEnvironmentTag_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalSpecialNoteTag" ADD CONSTRAINT "AnimalSpecialNoteTag_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FosterRecord" ADD CONSTRAINT "FosterRecord_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FosterRecordImage" ADD CONSTRAINT "FosterRecordImage_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "FosterRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FosterApplication" ADD CONSTRAINT "FosterApplication_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FosterApplication" ADD CONSTRAINT "FosterApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

