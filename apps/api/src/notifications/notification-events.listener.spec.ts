import { NotificationEventsListener } from './notification-events.listener';
import { NOTIFICATION_EVENTS } from './notification.events';
import type { EmailTemplatesService } from './email-templates.service';
import type { TemplateRendererService } from './template-renderer.service';
import type { NotificationsService } from './notifications.service';
import type { EmailQueueService } from './email-queue.service';
import type { PrismaService } from '../common/prisma/prisma.service';

function fakeEmailTemplates(
  resolve: jest.Mock = jest.fn().mockResolvedValue(null),
) {
  return { resolve } as unknown as EmailTemplatesService;
}

function fakeRenderer(): TemplateRendererService {
  return {
    render: jest.fn((template: string, data: Record<string, string>) =>
      template.replace(
        /\{\{\s*(\w+)\s*\}\}/g,
        (_match, key: string) => data[key],
      ),
    ),
  };
}

function fakeNotifications(): NotificationsService {
  return {
    notify: jest.fn().mockResolvedValue(undefined),
  } as unknown as NotificationsService;
}

function fakeEmailQueue(): EmailQueueService {
  return {
    enqueue: jest.fn().mockResolvedValue(undefined),
  } as unknown as EmailQueueService;
}

function fakePrisma(
  userEmail: string | null = 'jane@example.com',
): PrismaService {
  return {
    user: {
      findUnique: jest
        .fn()
        .mockResolvedValue(
          userEmail ? { id: 'user-1', email: userEmail } : null,
        ),
    },
  } as unknown as PrismaService;
}

const payload = {
  organizationId: 'org-1',
  conferenceId: 'conf-1',
  userId: 'user-1',
  templateData: { participantName: 'Jane' },
  entityType: 'abstract',
  entityId: 'abstract-1',
};

describe('NotificationEventsListener.onAbstractAccepted', () => {
  it('does nothing when no EmailTemplate is configured for the event', async () => {
    const emailTemplates = fakeEmailTemplates(
      jest.fn().mockResolvedValue(null),
    );
    const emailQueue = fakeEmailQueue();
    const notifications = fakeNotifications();
    const listener = new NotificationEventsListener(
      emailTemplates,
      fakeRenderer(),
      notifications,
      emailQueue,
      fakePrisma(),
    );

    await listener.onAbstractAccepted(payload);

    expect(emailQueue.enqueue).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('does nothing when the target user no longer exists', async () => {
    const emailTemplates = fakeEmailTemplates(
      jest
        .fn()
        .mockResolvedValue({ subject: 'Hi {{participantName}}', body: 'Body' }),
    );
    const emailQueue = fakeEmailQueue();
    const listener = new NotificationEventsListener(
      emailTemplates,
      fakeRenderer(),
      fakeNotifications(),
      emailQueue,
      fakePrisma(null),
    );

    await listener.onAbstractAccepted(payload);

    expect(emailQueue.enqueue).not.toHaveBeenCalled();
  });

  it('resolves the template for the correct event, renders it, enqueues the email, and records an in-app notification', async () => {
    const resolve = jest.fn().mockResolvedValue({
      subject: 'Congratulations {{participantName}}',
      body: 'Your abstract was accepted, {{participantName}}.',
    });
    const emailTemplates = fakeEmailTemplates(resolve);
    const emailQueue = fakeEmailQueue();
    const notifications = fakeNotifications();
    const listener = new NotificationEventsListener(
      emailTemplates,
      fakeRenderer(),
      notifications,
      emailQueue,
      fakePrisma(),
    );

    await listener.onAbstractAccepted(payload);

    expect(resolve).toHaveBeenCalledWith(
      'org-1',
      'conf-1',
      NOTIFICATION_EVENTS.ABSTRACT_ACCEPTED,
    );
    expect(emailQueue.enqueue).toHaveBeenCalledWith({
      to: 'jane@example.com',
      subject: 'Congratulations Jane',
      body: 'Your abstract was accepted, Jane.',
    });
    expect(notifications.notify).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      NOTIFICATION_EVENTS.ABSTRACT_ACCEPTED,
      'Congratulations Jane',
      'Your abstract was accepted, Jane.',
      payload.templateData,
      'abstract',
      'abstract-1',
    );
  });
});

describe('NotificationEventsListener — every §20 trigger wraps the shared handler with its own event name', () => {
  const cases: Array<[keyof NotificationEventsListener, string]> = [
    ['onAbstractSubmitted', NOTIFICATION_EVENTS.ABSTRACT_SUBMITTED],
    ['onReviewAssigned', NOTIFICATION_EVENTS.REVIEW_ASSIGNED],
    ['onReviewDue', NOTIFICATION_EVENTS.REVIEW_DUE],
    [
      'onAbstractRevisionRequired',
      NOTIFICATION_EVENTS.ABSTRACT_REVISION_REQUIRED,
    ],
    ['onAbstractAccepted', NOTIFICATION_EVENTS.ABSTRACT_ACCEPTED],
    ['onPaymentSucceeded', NOTIFICATION_EVENTS.PAYMENT_SUCCEEDED],
    ['onCertificateIssued', NOTIFICATION_EVENTS.CERTIFICATE_ISSUED],
    ['onConferenceReminder', NOTIFICATION_EVENTS.CONFERENCE_REMINDER],
  ];

  it.each(cases)(
    '%s resolves the template using event %s',
    async (methodName, eventName) => {
      const resolve = jest.fn().mockResolvedValue(null);
      const emailTemplates = fakeEmailTemplates(resolve);
      const listener = new NotificationEventsListener(
        emailTemplates,
        fakeRenderer(),
        fakeNotifications(),
        fakeEmailQueue(),
        fakePrisma(),
      );

      await listener[methodName](payload);

      expect(resolve).toHaveBeenCalledWith('org-1', 'conf-1', eventName);
    },
  );
});
