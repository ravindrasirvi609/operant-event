import { Module } from '@nestjs/common';
import { RegistrationCategoriesController } from './registration-categories.controller';
import { RegistrationCategoriesService } from './registration-categories.service';
import { RegistrationTypesController } from './registration-types.controller';
import { RegistrationTypesService } from './registration-types.service';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';

@Module({
  controllers: [
    RegistrationCategoriesController,
    RegistrationTypesController,
    RegistrationsController,
  ],
  providers: [
    RegistrationCategoriesService,
    RegistrationTypesService,
    RegistrationsService,
  ],
  exports: [
    RegistrationCategoriesService,
    RegistrationTypesService,
    RegistrationsService,
  ],
})
export class RegistrationsModule {}
