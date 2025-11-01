import { Injectable, NotFoundException } from '@nestjs/common';

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
}
