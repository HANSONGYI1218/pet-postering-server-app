-- AlterTable
ALTER TABLE "FosterApplication" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "FosterApplication_userId_idx" ON "FosterApplication"("userId");

-- AddForeignKey
ALTER TABLE "FosterApplication" ADD CONSTRAINT "FosterApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
