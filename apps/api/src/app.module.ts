import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { EnvModule } from './common/env/env.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { RolesModule } from './roles/roles.module';
import { ConferencesModule } from './conferences/conferences.module';
import { ConferenceSettingsModule } from './conference-settings/conference-settings.module';
import { TracksModule } from './tracks/tracks.module';
import { FilesModule } from './files/files.module';
import { ConferenceFormFieldsModule } from './conference-form-fields/conference-form-fields.module';
import { AbstractsModule } from './abstracts/abstracts.module';
import { ReviewersModule } from './reviewers/reviewers.module';
import { DecisionsModule } from './decisions/decisions.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { InvoicesModule } from './invoices/invoices.module';

@Module({
  imports: [
    EnvModule,
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    RolesModule,
    ConferencesModule,
    ConferenceSettingsModule,
    TracksModule,
    FilesModule,
    ConferenceFormFieldsModule,
    AbstractsModule,
    ReviewersModule,
    DecisionsModule,
    RegistrationsModule,
    OrdersModule,
    PaymentsModule,
    InvoicesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
