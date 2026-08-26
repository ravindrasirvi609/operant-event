import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { ExportQueueService, EXPORT_QUEUE } from './export-queue.service';

@Module({
  imports: [BullModule.registerQueue({ name: EXPORT_QUEUE })],
  controllers: [ExportsController],
  providers: [ExportsService, ExportQueueService],
  exports: [ExportsService],
})
export class ExportsModule {}
