-- AlterTable
ALTER TABLE "public"."FosterRecord" ADD COLUMN     "healthNote" TEXT;

-- AlterTable
ALTER TABLE "public"."Organization" ADD COLUMN     "email" TEXT,
ADD COLUMN     "zipcode" TEXT;
