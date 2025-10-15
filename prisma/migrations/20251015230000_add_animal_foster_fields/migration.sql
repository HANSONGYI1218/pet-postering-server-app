-- AlterTable
ALTER TABLE "Animal"
ADD COLUMN     "euthanasiaDate" TIMESTAMP(3),
ADD COLUMN     "isFosterCondition" BOOLEAN NOT NULL DEFAULT false;
