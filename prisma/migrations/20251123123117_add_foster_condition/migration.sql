-- CreateEnum
CREATE TYPE "AnimalAge" AS ENUM ('JUVENILE', 'ADULT', 'SENIOR');

-- CreateTable
CREATE TABLE "FosterCondition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferredTypes" "AnimalType"[] DEFAULT ARRAY[]::"AnimalType"[],
    "preferredSizes" "AnimalSize"[] DEFAULT ARRAY[]::"AnimalSize"[],
    "preferredAges" "AnimalAge"[] DEFAULT ARRAY[]::"AnimalAge"[],
    "fosterEnvironments" "AnimalEnvironmentTagType"[] DEFAULT ARRAY[]::"AnimalEnvironmentTagType"[],
    "fosterPeriod" TEXT,
    "specialNoteTags" "AnimalSpecialNoteTagType"[] DEFAULT ARRAY[]::"AnimalSpecialNoteTagType"[],
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
CREATE TABLE "FosterApplication" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
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
CREATE UNIQUE INDEX "FosterCondition_userId_key" ON "FosterCondition"("userId");

-- CreateIndex
CREATE INDEX "FosterExperience_fosterConditionId_idx" ON "FosterExperience"("fosterConditionId");

-- CreateIndex
CREATE INDEX "FosterApplication_animalId_idx" ON "FosterApplication"("animalId");

-- AddForeignKey
ALTER TABLE "FosterCondition" ADD CONSTRAINT "FosterCondition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FosterExperience" ADD CONSTRAINT "FosterExperience_fosterConditionId_fkey" FOREIGN KEY ("fosterConditionId") REFERENCES "FosterCondition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FosterApplication" ADD CONSTRAINT "FosterApplication_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
