
import { BadRequestException } from '@nestjs/common';
import { ConferenceSettingsController } from './conference-settings.controller';

describe('ConferenceSettingsController — certificate template upload', () => {
  const service = {
    uploadCertificateTemplate: jest.fn(),
  };

  const controller = new ConferenceSettingsController(service as never);

  const user = {
    id: 'user-1',
  };

  const validPng = {
    originalname: 'certificate.png',
    mimetype: 'image/png',
    size: 1024,
    buffer: Buffer.from('fake-png'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects when no file is provided', () => {
    expect(() =>
      controller.uploadCertificateTemplate(
        'org-1',
        user as never,
        'conf-1',
        undefined,
      ),
    ).toThrow(BadRequestException);

    expect(service.uploadCertificateTemplate).not.toHaveBeenCalled();
  });

  it('rejects unsupported file types', () => {
    expect(() =>
      controller.uploadCertificateTemplate(
        'org-1',
        user as never,
        'conf-1',
        {
          ...validPng,
          originalname: 'certificate.jpg',
          mimetype: 'image/jpeg',
        },
      ),
    ).toThrow(BadRequestException);

    expect(service.uploadCertificateTemplate).not.toHaveBeenCalled();
  });

  it('forwards a valid PNG to the service', () => {
    service.uploadCertificateTemplate.mockReturnValue({
      message: 'Certificate template uploaded successfully.',
    });

    controller.uploadCertificateTemplate(
      'org-1',
      user as never,
      'conf-1',
      validPng,
    );

    expect(service.uploadCertificateTemplate).toHaveBeenCalledWith(
      'org-1',
      'conf-1',
      'user-1',
      {
        fileName: 'certificate.png',
        mimeType: 'image/png',
        size: 1024,
        buffer: validPng.buffer,
      },
    );
  });

  it('accepts PDF templates', () => {
    service.uploadCertificateTemplate.mockReturnValue({
      message: 'Certificate template uploaded successfully.',
    });

    const pdf = {
      ...validPng,
      originalname: 'certificate.pdf',
      mimetype: 'application/pdf',
    };

    controller.uploadCertificateTemplate(
      'org-1',
      user as never,
      'conf-1',
      pdf,
    );

    expect(service.uploadCertificateTemplate).toHaveBeenCalledWith(
      'org-1',
      'conf-1',
      'user-1',
      expect.objectContaining({
        fileName: 'certificate.pdf',
        mimeType: 'application/pdf',
      }),
    );
  });
});
