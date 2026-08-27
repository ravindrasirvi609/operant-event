import { Module } from '@nestjs/common';
import {
  ConferenceFormFieldsController,
  SubmissionFormFieldsController,
} from './conference-form-fields.controller';
import { ConferenceFormFieldsService } from './conference-form-fields.service';

@Module({
  controllers: [ConferenceFormFieldsController, SubmissionFormFieldsController],
  providers: [ConferenceFormFieldsService],
  exports: [ConferenceFormFieldsService],
})
export class ConferenceFormFieldsModule {}
