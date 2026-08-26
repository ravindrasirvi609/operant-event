import { Module } from '@nestjs/common';
import { ExhibitorsController } from './exhibitors.controller';
import { ExhibitorsService } from './exhibitors.service';

@Module({
  controllers: [ExhibitorsController],
  providers: [ExhibitorsService],
  exports: [ExhibitorsService],
})
export class ExhibitorsModule {}
