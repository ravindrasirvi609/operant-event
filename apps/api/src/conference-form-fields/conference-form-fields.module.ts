import { Module } from '@nestjs/common';
import { ConferenceFormFieldsController } from './conference-form-fields.controller';
import { ConferenceFormFieldsService } from './conference-form-fields.service';

@Module({
  controllers: [ConferenceFormFieldsController],
  providers: [ConferenceFormFieldsService],
  exports: [ConferenceFormFieldsService],
})
export class ConferenceFormFieldsModule {}
