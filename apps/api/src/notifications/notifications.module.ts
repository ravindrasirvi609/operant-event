import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailTemplatesController } from './email-templates.controller';
import { EmailTemplatesService } from './email-templates.service';
import { TemplateRendererService } from './template-renderer.service';
import { EmailQueueService, EMAIL_QUEUE } from './email-queue.service';
import { NotificationEventsListener } from './notification-events.listener';
import { RemindersScheduler } from './reminders.scheduler';

@Module({
  imports: [
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
    ScheduleModule.forRoot(),
  ],
  controllers: [NotificationsController, EmailTemplatesController],
  providers: [
    NotificationsService,
    EmailTemplatesService,
    TemplateRendererService,
    EmailQueueService,
    NotificationEventsListener,
    RemindersScheduler,
  ],
  exports: [NotificationsService, EmailTemplatesService],
})
export class NotificationsModule {}
