import { Module } from '@nestjs/common';
import { AbstractsController } from './abstracts.controller';
import { AbstractsService } from './abstracts.service';

@Module({
  controllers: [AbstractsController],
  providers: [AbstractsService],
  exports: [AbstractsService],
})
export class AbstractsModule {}
