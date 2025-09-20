import { Test } from '@nestjs/testing';

import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { CommunityController } from './community.controller';
import { CommunityModule } from './community.module';
import { CommunityService } from './community.service';

describe('CommunityModule', () => {
  it('컨트롤러와 서비스가 제공된다', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, CommunityModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    expect(moduleRef.get(CommunityController)).toBeInstanceOf(
      CommunityController,
    );
    expect(moduleRef.get(CommunityService)).toBeInstanceOf(CommunityService);
  });
});
