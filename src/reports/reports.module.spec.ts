import { Test } from '@nestjs/testing';

import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsController } from './reports.controller';
import { ReportsModule } from './reports.module';
import { ReportsService } from './reports.service';

describe('ReportsModule', () => {
  it('컨트롤러와 서비스가 로드된다', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, ReportsModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    expect(moduleRef.get(ReportsController)).toBeInstanceOf(ReportsController);
    expect(moduleRef.get(ReportsService)).toBeInstanceOf(ReportsService);
  });
});
