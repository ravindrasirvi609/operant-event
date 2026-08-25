import { Module } from '@nestjs/common';
import { ConferenceSettingsController } from './conference-settings.controller';
import { ConferenceSettingsService } from './conference-settings.service';

@Module({
  controllers: [ConferenceSettingsController],
  providers: [ConferenceSettingsService],
  exports: [ConferenceSettingsService],
})
export class ConferenceSettingsModule {}
