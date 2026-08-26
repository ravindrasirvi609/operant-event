import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { ImportQueueService, IMPORT_QUEUE } from './import-queue.service';

@Module({
  imports: [BullModule.registerQueue({ name: IMPORT_QUEUE })],
  controllers: [ImportsController],
  providers: [ImportsService, ImportQueueService],
  exports: [ImportsService],
})
export class ImportsModule {}
