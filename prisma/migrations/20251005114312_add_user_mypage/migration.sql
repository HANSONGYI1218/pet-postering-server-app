-- CreateTable
CREATE TABLE "public"."UserProfile" (
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
CREATE TABLE "public"."UserNotificationSetting" (
    "userId" TEXT NOT NULL,
    "commentEmail" BOOLEAN NOT NULL DEFAULT true,
    "fosterAnimalInfoEmail" BOOLEAN NOT NULL DEFAULT true,
    "fosterAnimalInfoKakao" BOOLEAN NOT NULL DEFAULT true,
    "marketingEmail" BOOLEAN NOT NULL DEFAULT false,
    "marketingKakao" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserNotificationSetting_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "public"."UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserNotificationSetting" ADD CONSTRAINT "UserNotificationSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
