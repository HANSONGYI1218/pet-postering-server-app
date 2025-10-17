import { PrismaClient } from '@prisma/client';

import {
  animalSeeds,
  communityCommentSeeds,
  communityPostSeeds,
  communityUserSeeds,
  organizationSeeds,
  recordSeeds,
  type UserNotificationSettingSeed,
  userNotificationSettingSeeds,
  type UserProfileSeed,
  userProfileSeeds,
} from './seed-data';

const prisma = new PrismaClient();

const seedOrganizations = async (): Promise<void> => {
  console.warn('🌱 Seeding organizations...');
  for (const org of organizationSeeds) {
    await prisma.organization.upsert({
      where: { id: org.id },
      create: org,
      update: org,
    });
  }
};

const clearSeedAnimals = async (): Promise<void> => {
  console.warn('🧹 Clearing existing seeded animals...');
  await prisma.animal.deleteMany({
    where: {
      id: { in: animalSeeds.map((seed) => seed.id) },
    },
  });
};

const seedAnimals = async (): Promise<void> => {
  console.warn('🐾 Creating foster animals...');
  for (const seed of animalSeeds) {
    const mainImageUrl = seed.images[0]?.url;
    await prisma.animal.create({
      data: {
        id: seed.id,
        name: seed.name,
        status: seed.status,
        shared: seed.shared,
        orgId: seed.orgId,
        type: seed.type,
        size: seed.size,
        gender: seed.gender,
        breed: seed.breed,
        birthDate: seed.birthDate,
        mainImageUrl,
        introduction: seed.introduction,
        remark: seed.remark,
        emergency: seed.emergency,
        emergencyReason: seed.emergencyReason,
        currentFosterStartDate: seed.currentFosterStartDate,
        currentFosterEndDate: seed.currentFosterEndDate,
        images: {
          create: seed.images.map((image, index) => ({
            url: image.url,
            sortOrder: image.sortOrder ?? index,
          })),
        },
        healthTags: {
          create: seed.healthTags.map((value) => ({ value })),
        },
        personalityTags: {
          create: seed.personalityTags.map((value) => ({ value })),
        },
        environmentTags: {
          create: seed.environmentTags.map((value) => ({ value })),
        },
        specialNoteTags: {
          create: seed.specialNoteTags.map((value) => ({ value })),
        },
      },
    });
  }
};

const seedRecords = async (): Promise<void> => {
  console.warn('📝 Creating foster records...');
  for (const { animalId, entries } of recordSeeds) {
    for (const entry of entries) {
      await prisma.fosterRecord.create({
        data: {
          animalId,
          date: entry.date,
          content: entry.content,
          healthNote: entry.healthNote,
          images: {
            create: entry.images.map((url, imageIndex) => ({
              url,
              sortOrder: imageIndex,
            })),
          },
        },
      });
    }
  }
};

const clearCommunitySeeds = async (): Promise<void> => {
  console.warn('🧹 Clearing existing community seeds...');
  const userIds = communityUserSeeds.map((seed) => seed.id);
  await prisma.userNotificationSetting.deleteMany({
    where: { userId: { in: userIds } },
  });
  await prisma.userProfile.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.comment.deleteMany({
    where: { id: { in: communityCommentSeeds.map((seed) => seed.id) } },
  });
  await prisma.post.deleteMany({
    where: { id: { in: communityPostSeeds.map((seed) => seed.id) } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: userIds } },
  });
};

const seedCommunityUsers = async (): Promise<void> => {
  console.warn('👤 Seeding community users...');
  for (const seed of communityUserSeeds) {
    await prisma.user.create({
      data: {
        id: seed.id,
        kakaoId: seed.kakaoId,
        displayName: seed.displayName,
        avatarUrl: seed.avatarUrl ?? null,
        role: seed.role,
      },
    });
  }
};

interface UserProfileUpsertInput {
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  zipcode: string | null;
  address: string | null;
  addressDetail: string | null;
  introduction: string | null;
  isEligibleForFoster: boolean;
}

interface UserNotificationSettingUpsertInput {
  commentEmail: boolean;
  fosterAnimalInfoEmail: boolean;
  fosterAnimalInfoKakao: boolean;
  marketingEmail: boolean;
  marketingKakao: boolean;
}

const buildUserProfileData = (seed: UserProfileSeed): UserProfileUpsertInput => ({
  name: seed.name ?? null,
  email: seed.email ?? null,
  phoneNumber: seed.phoneNumber ?? null,
  zipcode: seed.zipcode ?? null,
  address: seed.address ?? null,
  addressDetail: seed.addressDetail ?? null,
  introduction: seed.introduction ?? null,
  isEligibleForFoster: seed.isEligibleForFoster ?? false,
});

const buildUserNotificationSettingData = (
  seed: UserNotificationSettingSeed,
): UserNotificationSettingUpsertInput => ({
  commentEmail: seed.commentEmail ?? true,
  fosterAnimalInfoEmail: seed.fosterAnimalInfoEmail ?? true,
  fosterAnimalInfoKakao: seed.fosterAnimalInfoKakao ?? true,
  marketingEmail: seed.marketingEmail ?? false,
  marketingKakao: seed.marketingKakao ?? false,
});

const seedUserProfiles = async (): Promise<void> => {
  console.warn('👥 Seeding user profiles...');
  await Promise.all(
    userProfileSeeds.map((seed) =>
      prisma.userProfile.upsert({
        where: { userId: seed.userId },
        update: buildUserProfileData(seed),
        create: { userId: seed.userId, ...buildUserProfileData(seed) },
      }),
    ),
  );
};

const seedUserNotificationSettings = async (): Promise<void> => {
  console.warn('🔔 Seeding user notification settings...');
  await Promise.all(
    userNotificationSettingSeeds.map((seed) =>
      prisma.userNotificationSetting.upsert({
        where: { userId: seed.userId },
        update: buildUserNotificationSettingData(seed),
        create: {
          userId: seed.userId,
          ...buildUserNotificationSettingData(seed),
        },
      }),
    ),
  );
};

const seedCommunityPosts = async (): Promise<void> => {
  console.warn('💬 Seeding community posts...');
  for (const seed of communityPostSeeds) {
    await prisma.post.create({
      data: {
        id: seed.id,
        authorId: seed.authorId,
        title: seed.title,
        content: seed.content,
        viewCount: seed.viewCount ?? 0,
        createdAt: seed.createdAt,
        updatedAt: seed.updatedAt ?? seed.createdAt,
      },
    });
  }
};

const seedCommunityComments = async (): Promise<void> => {
  console.warn('💭 Seeding community comments...');
  for (const seed of communityCommentSeeds) {
    await prisma.comment.create({
      data: {
        id: seed.id,
        postId: seed.postId,
        authorId: seed.authorId,
        content: seed.content,
        parentId: seed.parentId ?? null,
        createdAt: seed.createdAt,
      },
    });
  }
};

async function main(): Promise<void> {
  await seedOrganizations();
  await clearSeedAnimals();
  await seedAnimals();
  await seedRecords();
  await clearCommunitySeeds();
  await seedCommunityUsers();
  await seedUserProfiles();
  await seedUserNotificationSettings();
  await seedCommunityPosts();
  await seedCommunityComments();
  console.warn('✅ Seeding finished!');
}

main()
  .catch((error: unknown) => {
    console.error('❌ Seeding failed', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
