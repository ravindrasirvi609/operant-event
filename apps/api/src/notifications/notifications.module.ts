import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailTemplatesController } from './email-templates.controller';
import { EmailTemplatesService } from './email-templates.service';
import { TemplateRendererService } from './template-renderer.service';
import { EmailQueueService, EMAIL_QUEUE } from './email-queue.service';
import { NotificationEventsListener } from './notification-events.listener';

@Module({
  imports: [BullModule.registerQueue({ name: EMAIL_QUEUE })],
  controllers: [NotificationsController, EmailTemplatesController],
  providers: [
    NotificationsService,
    EmailTemplatesService,
    TemplateRendererService,
    EmailQueueService,
    NotificationEventsListener,
  ],
  exports: [NotificationsService, EmailTemplatesService],
})
export class NotificationsModule {}
