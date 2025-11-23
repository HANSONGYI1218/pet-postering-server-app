import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { AuthUser } from '../common/types';
import {
  toOrganizationAnimalDetail,
  toOrganizationAnimalListItem,
} from '../domain/organization/application/mappers';
import type {
  OrganizationAnimalDetail,
  OrganizationAnimalListResult,
} from '../domain/organization/application/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async listAnimals(): Promise<OrganizationAnimalListResult> {
    const animals = await this.prisma.animal.findMany({
      where: { orgId: { not: null } },
      orderBy: { createdAt: 'desc' },
      include: {
        healthTags: true,
        personalityTags: true,
        environmentTags: true,
        applications: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    return {
      items: animals.map((animal) => toOrganizationAnimalListItem(animal)),
    };
  }

  async getAnimal(id: string): Promise<OrganizationAnimalDetail> {
    const animal = await this.prisma.animal.findUnique({
      where: { id },
      include: {
        organization: true,
        healthTags: true,
        personalityTags: true,
        environmentTags: true,
        specialNoteTags: true,
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        applications: {
          orderBy: { createdAt: 'desc' },
        },
        records: {
          orderBy: { date: 'desc' },
          include: {
            images: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });
    if (!animal) {
      throw new NotFoundException('organization-animal-not-found');
    }
    return toOrganizationAnimalDetail(animal);
  }

  async acceptApplication(user: AuthUser, applicationId: string): Promise<void> {
    if (user.role !== 'ORG_ADMIN') {
      throw new ForbiddenException('org-admin-only');
    }

    const application = await this.prisma.fosterApplication.findUnique({
      where: { id: applicationId },
      include: { animal: true },
    });
    if (!application) {
      throw new NotFoundException('application-not-found');
    }
    if (!application.animal.orgId) {
      throw new ForbiddenException('application-not-organization');
    }
    if (!application.userId) {
      throw new ForbiddenException('application-user-missing');
    }
    if (application.animal.status !== 'WAITING') {
      throw new BadRequestException('animal-already-fostered');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.animal.update({
        where: { id: application.animalId },
        data: {
          status: 'IN_PROGRESS',
          currentFosterStartDate: new Date(),
          ownerUserId: application.userId,
        },
      });
    });
  }
}
