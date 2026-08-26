import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { ScheduleConflictService } from './schedule-conflict.service';

@Module({
  controllers: [SessionsController],
  providers: [SessionsService, ScheduleConflictService],
  exports: [SessionsService, ScheduleConflictService],
})
export class SessionsModule {}
