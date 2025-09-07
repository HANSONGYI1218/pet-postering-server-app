import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app/app.controller';
import { AppService } from './app/app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CommunityModule } from './community/community.module';
import { FosterModule } from './foster/foster.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, CommunityModule, FosterModule, ReportsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
