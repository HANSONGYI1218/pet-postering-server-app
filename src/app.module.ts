import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { AppController } from './app/app.controller';
import { AppService } from './app/app.service';
import { AuthModule } from './auth/auth.module';
import { CommunityModule } from './community/community.module';
import { FosterModule } from './foster/foster.module';
import { buildLoggerOptions } from './logger/logger.config';
import { OrganizationModule } from './organization/organization.module';
import { PrismaModule } from './prisma/prisma.module';
import { PublicFosterModule } from './public-foster/public-foster.module';
import { PublicNoticeModule } from './public-notice/public-notice.module';
import { ReportsModule } from './reports/reports.module';
import { UsersModule } from './user/user.module';

@Module({
  imports: [
    LoggerModule.forRoot(buildLoggerOptions(process.env)),
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CommunityModule,
    FosterModule,
    OrganizationModule,
    ReportsModule,
    PublicFosterModule,
    PublicNoticeModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
