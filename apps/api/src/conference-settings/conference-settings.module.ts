
import { Module } from '@nestjs/common';
import { ConferenceSettingsController } from './conference-settings.controller';
import { ConferenceSettingsService } from './conference-settings.service';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [ConferenceSettingsController],
  providers: [ConferenceSettingsService],
  exports: [ConferenceSettingsService],
})
export class ConferenceSettingsModule {}
