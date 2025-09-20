import { Test } from '@nestjs/testing';
import { FosterModule } from './foster.module';
import { FosterController } from './foster.controller';
import { FosterService } from './foster.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaModule } from '../prisma/prisma.module';

describe('FosterModule', () => {
  it('컨트롤러와 서비스가 정의된다', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, FosterModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    expect(moduleRef.get(FosterController)).toBeInstanceOf(FosterController);
    expect(moduleRef.get(FosterService)).toBeInstanceOf(FosterService);
  });
});
