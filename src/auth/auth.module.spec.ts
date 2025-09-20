import { Test } from '@nestjs/testing';
import { AuthModule } from './auth.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaModule } from '../prisma/prisma.module';

describe('AuthModule', () => {
  it('정상적으로 컨트롤러와 서비스가 정의된다', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, AuthModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    expect(moduleRef.get(AuthController)).toBeInstanceOf(AuthController);
    expect(moduleRef.get(AuthService)).toBeInstanceOf(AuthService);
  });
});
