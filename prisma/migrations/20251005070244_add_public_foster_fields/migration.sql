-- CreateEnum
CREATE TYPE "public"."AnimalType" AS ENUM ('DOG', 'CAT');

-- CreateEnum
CREATE TYPE "public"."AnimalGender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "public"."AnimalSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "public"."AnimalHealthTagType" AS ENUM ('NEUTERED', 'VACCINATED', 'MICROCHIPPED', 'HEARTWORM_TESTED', 'DEWORMED', 'FLEA_TICK_TREATED');

-- CreateEnum
CREATE TYPE "public"."AnimalPersonalityTagType" AS ENUM ('QUIET', 'ENERGETIC', 'INDEPENDENCE', 'SENSITIVITY', 'FRIENDLY_WITH_PEOPLE', 'GOOD_WITH_OTHER_ANIMAL', 'POTTY_TRAINING_COMPLETION', 'NO_BITING');

-- CreateEnum
CREATE TYPE "public"."AnimalEnvironmentTagType" AS ENUM ('QUIET_ENVIRONMENT', 'AVAILABILITY_FOR_WALKS_PLAY', 'FREQUENT_INTERACTION_WITH_PETS', 'PRESENCE_OF_OTHER_ANIMAL', 'WILLINGNESS_FOR_POTTY_TRAINING', 'PATIENCE_WITH_BARKING_BITING', 'CARE_FOR_SENSITIVE_OR_FEARFUL_PETS', 'HOUSEHOLD_WITH_YOUNG_CHILDREN');

-- CreateEnum
CREATE TYPE "public"."AnimalSpecialNoteTagType" AS ENUM ('SEPARATION_ANXIETY', 'MEDICATION_REQUIRED', 'POTTY_ACCIDENTS', 'AGGRESSION_TOWARD_OTHER_ANIMALS', 'ONGOING_TREATMENT_OR_RECOVERY', 'DISABLED_OR_ILL_PETS_ACCEPTED');

-- AlterTable
ALTER TABLE "public"."Animal" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "breed" TEXT,
ADD COLUMN     "currentFosterEndDate" TIMESTAMP(3),
ADD COLUMN     "currentFosterStartDate" TIMESTAMP(3),
ADD COLUMN     "emergency" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emergencyReason" TEXT,
ADD COLUMN     "gender" "public"."AnimalGender",
ADD COLUMN     "introduction" TEXT,
ADD COLUMN     "mainImageUrl" TEXT,
ADD COLUMN     "remark" TEXT,
ADD COLUMN     "size" "public"."AnimalSize",
ADD COLUMN     "type" "public"."AnimalType";

-- AlterTable
ALTER TABLE "public"."Organization" ADD COLUMN     "address" TEXT,
ADD COLUMN     "addressDetail" TEXT,
ADD COLUMN     "donationAccountHolder" TEXT,
ADD COLUMN     "donationAccountNumber" TEXT,
ADD COLUMN     "donationBankName" TEXT,
ADD COLUMN     "phoneNumber" TEXT;

-- CreateTable
CREATE TABLE "public"."AnimalImage" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimalImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AnimalHealthTag" (
    "animalId" TEXT NOT NULL,
    "value" "public"."AnimalHealthTagType" NOT NULL,

    CONSTRAINT "AnimalHealthTag_pkey" PRIMARY KEY ("animalId","value")
);

-- CreateTable
CREATE TABLE "public"."AnimalPersonalityTag" (
    "animalId" TEXT NOT NULL,
    "value" "public"."AnimalPersonalityTagType" NOT NULL,

    CONSTRAINT "AnimalPersonalityTag_pkey" PRIMARY KEY ("animalId","value")
);

-- CreateTable
CREATE TABLE "public"."AnimalEnvironmentTag" (
    "animalId" TEXT NOT NULL,
    "value" "public"."AnimalEnvironmentTagType" NOT NULL,

    CONSTRAINT "AnimalEnvironmentTag_pkey" PRIMARY KEY ("animalId","value")
);

-- CreateTable
CREATE TABLE "public"."AnimalSpecialNoteTag" (
    "animalId" TEXT NOT NULL,
    "value" "public"."AnimalSpecialNoteTagType" NOT NULL,

    CONSTRAINT "AnimalSpecialNoteTag_pkey" PRIMARY KEY ("animalId","value")
);

-- CreateIndex
CREATE INDEX "AnimalImage_animalId_idx" ON "public"."AnimalImage"("animalId");

-- CreateIndex
CREATE UNIQUE INDEX "AnimalImage_animalId_sortOrder_key" ON "public"."AnimalImage"("animalId", "sortOrder");

-- AddForeignKey
ALTER TABLE "public"."AnimalImage" ADD CONSTRAINT "AnimalImage_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "public"."Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AnimalHealthTag" ADD CONSTRAINT "AnimalHealthTag_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "public"."Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AnimalPersonalityTag" ADD CONSTRAINT "AnimalPersonalityTag_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "public"."Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AnimalEnvironmentTag" ADD CONSTRAINT "AnimalEnvironmentTag_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "public"."Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AnimalSpecialNoteTag" ADD CONSTRAINT "AnimalSpecialNoteTag_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "public"."Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
