import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailTemplatesService } from './email-templates.service';
import { TemplateRendererService } from './template-renderer.service';
import { NotificationsService } from './notifications.service';
import { EmailQueueService } from './email-queue.service';
import {
  NOTIFICATION_EVENTS,
  type NotificationEventPayload,
} from './notification.events';

/** §20: one listener method per trigger row, all sharing the same render -> enqueue -> notify pipeline. */
@Injectable()
export class NotificationEventsListener {
  constructor(
    private readonly emailTemplates: EmailTemplatesService,
    private readonly renderer: TemplateRendererService,
    private readonly notifications: NotificationsService,
    private readonly emailQueue: EmailQueueService,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent(NOTIFICATION_EVENTS.ABSTRACT_SUBMITTED)
  onAbstractSubmitted(payload: NotificationEventPayload): Promise<void> {
    return this.handle(NOTIFICATION_EVENTS.ABSTRACT_SUBMITTED, payload);
  }

  @OnEvent(NOTIFICATION_EVENTS.REVIEW_ASSIGNED)
  onReviewAssigned(payload: NotificationEventPayload): Promise<void> {
    return this.handle(NOTIFICATION_EVENTS.REVIEW_ASSIGNED, payload);
  }

  @OnEvent(NOTIFICATION_EVENTS.REVIEW_DUE)
  onReviewDue(payload: NotificationEventPayload): Promise<void> {
    return this.handle(NOTIFICATION_EVENTS.REVIEW_DUE, payload);
  }

  @OnEvent(NOTIFICATION_EVENTS.ABSTRACT_REVISION_REQUIRED)
  onAbstractRevisionRequired(payload: NotificationEventPayload): Promise<void> {
    return this.handle(NOTIFICATION_EVENTS.ABSTRACT_REVISION_REQUIRED, payload);
  }

  @OnEvent(NOTIFICATION_EVENTS.ABSTRACT_ACCEPTED)
  onAbstractAccepted(payload: NotificationEventPayload): Promise<void> {
    return this.handle(NOTIFICATION_EVENTS.ABSTRACT_ACCEPTED, payload);
  }

  @OnEvent(NOTIFICATION_EVENTS.PAYMENT_SUCCEEDED)
  onPaymentSucceeded(payload: NotificationEventPayload): Promise<void> {
    return this.handle(NOTIFICATION_EVENTS.PAYMENT_SUCCEEDED, payload);
  }

  @OnEvent(NOTIFICATION_EVENTS.CERTIFICATE_ISSUED)
  onCertificateIssued(payload: NotificationEventPayload): Promise<void> {
    return this.handle(NOTIFICATION_EVENTS.CERTIFICATE_ISSUED, payload);
  }

  @OnEvent(NOTIFICATION_EVENTS.CONFERENCE_REMINDER)
  onConferenceReminder(payload: NotificationEventPayload): Promise<void> {
    return this.handle(NOTIFICATION_EVENTS.CONFERENCE_REMINDER, payload);
  }

  private async handle(
    event: string,
    payload: NotificationEventPayload,
  ): Promise<void> {
    const template = await this.emailTemplates.resolve(
      payload.organizationId,
      payload.conferenceId,
      event,
    );
    if (!template) {
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user) {
      return;
    }

    const subject = this.renderer.render(
      template.subject,
      payload.templateData,
    );
    const body = this.renderer.render(template.body, payload.templateData);

    await this.emailQueue.enqueue({ to: user.email, subject, body });
    await this.notifications.notify(
      payload.organizationId,
      payload.userId,
      event,
      subject,
      body,
      payload.templateData,
    );
  }
}
