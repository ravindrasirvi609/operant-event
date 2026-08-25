import { Module } from '@nestjs/common';
import { ConferencesController } from './conferences.controller';
import { ConferencesService } from './conferences.service';

@Module({
  controllers: [ConferencesController],
  providers: [ConferencesService],
  exports: [ConferencesService],
})
export class ConferencesModule {}
