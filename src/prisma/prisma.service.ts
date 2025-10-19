import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly logger: PinoLogger) {
    super({
      log: [{ emit: 'event', level: 'error' }],
    });
    this.logger.setContext(PrismaService.name);
    this.registerErrorListener();
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.debug({ msg: 'prisma-connected' });
    } catch (error: unknown) {
      this.logger.error({ msg: 'prisma-connect-failed', err: error });
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      this.logger.debug({ msg: 'prisma-disconnected' });
    } catch (error: unknown) {
      this.logger.error({ msg: 'prisma-disconnect-failed', err: error });
      throw error;
    }
  }

  private registerErrorListener(): void {
    this.$on('error', (event: Prisma.LogEvent) => {
      this.logger.error({
        msg: 'prisma-client-error',
        target: event.target,
        message: event.message,
      });
    });
  }
}
