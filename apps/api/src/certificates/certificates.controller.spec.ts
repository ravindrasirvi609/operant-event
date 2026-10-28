
import { StreamableFile } from '@nestjs/common';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';

describe('CertificatesController', () => {
  let controller: CertificatesController;
  let service: jest.Mocked<CertificatesService>;

  beforeEach(() => {
    service = {
      verifyByCode: jest.fn(),
      downloadOwnedCertificate: jest.fn(),
      findMine: jest.fn(),
      getMyConferenceFeedback: jest.fn(),
      submitConferenceFeedback: jest.fn(),
      findAllForConference: jest.fn(),
      generateForConference: jest.fn(),
      issue: jest.fn(),
      regenerateIssuedCertificatePdf: jest.fn(),
      revoke: jest.fn(),
      findOwned: jest.fn(),
      findForOrganizer: jest.fn(),
    } as unknown as jest.Mocked<CertificatesService>;

    controller = new CertificatesController(service);
  });

  it('verifies a certificate by code', async () => {
    const result = { valid: true };
    service.verifyByCode.mockResolvedValue(result as never);

    await expect(controller.verifyByCode('CERT-123')).resolves.toEqual(result);
    expect(service.verifyByCode).toHaveBeenCalledWith('CERT-123');
  });

  it('lists certificates for the current participant', async () => {
    const result = [{ id: 'certificate-1' }];
    service.findMine.mockResolvedValue(result as never);

    await expect(controller.findMine({ id: 'user-1' } as never))
      .resolves.toEqual(result);
    expect(service.findMine).toHaveBeenCalledWith('user-1');
  });

  it('gets feedback for the current participant and conference', async () => {
    const result = { rating: 5 };
    service.getMyConferenceFeedback.mockResolvedValue(result as never);

    await expect(
      controller.getMyConferenceFeedback(
        { id: 'user-1' } as never,
        'conference-1',
      ),
    ).resolves.toEqual(result);

    expect(service.getMyConferenceFeedback).toHaveBeenCalledWith(
      'user-1',
      'conference-1',
    );
  });

  it('submits conference feedback', async () => {
    const body = {
      rating: 5,
      contentRating: 'EXCELLENT',
      comments: 'Great conference',
    };
    const result = { id: 'feedback-1', ...body };
    service.submitConferenceFeedback.mockResolvedValue(result as never);

    await expect(
      controller.submitConferenceFeedback(
        { id: 'user-1' } as never,
        'conference-1',
        body,
      ),
    ).resolves.toEqual(result);

    expect(service.submitConferenceFeedback).toHaveBeenCalledWith(
      'user-1',
      'conference-1',
      body,
    );
  });

  it('lists certificates for a conference in the organization', async () => {
    const result = [{ id: 'certificate-1' }];
    service.findAllForConference.mockResolvedValue(result as never);

    await expect(
      controller.findAllForConference('org-1', 'conference-1'),
    ).resolves.toEqual(result);

    expect(service.findAllForConference).toHaveBeenCalledWith(
      'org-1',
      'conference-1',
    );
  });

  it('generates certificates for a conference', async () => {
    const result = { generated: 2 };
    service.generateForConference.mockResolvedValue(result as never);

    await expect(
      controller.generateForConference('org-1', 'conference-1'),
    ).resolves.toEqual(result);

    expect(service.generateForConference).toHaveBeenCalledWith(
      'org-1',
      'conference-1',
    );
  });

  it('issues a certificate', async () => {
    const result = { id: 'certificate-1', status: 'ISSUED' };
    service.issue.mockResolvedValue(result as never);

    await expect(
      controller.issue('org-1', 'certificate-1'),
    ).resolves.toEqual(result);

    expect(service.issue).toHaveBeenCalledWith('org-1', 'certificate-1');
  });

  it('regenerates an issued certificate PDF', async () => {
    const result = { id: 'certificate-1' };
    service.regenerateIssuedCertificatePdf.mockResolvedValue(result as never);

    await expect(
      controller.regeneratePdf('org-1', 'certificate-1'),
    ).resolves.toEqual(result);

    expect(service.regenerateIssuedCertificatePdf).toHaveBeenCalledWith(
      'org-1',
      'certificate-1',
    );
  });

  it('revokes a certificate', async () => {
    const result = { id: 'certificate-1', status: 'REVOKED' };
    service.revoke.mockResolvedValue(result as never);

    await expect(
      controller.revoke('org-1', 'certificate-1'),
    ).resolves.toEqual(result);

    expect(service.revoke).toHaveBeenCalledWith('org-1', 'certificate-1');
  });

  it('finds a certificate owned by the participant', async () => {
    const result = { id: 'certificate-1' };
    service.findOwned.mockResolvedValue(result as never);

    await expect(
      controller.findOwned({ id: 'user-1' } as never, 'certificate-1'),
    ).resolves.toEqual(result);

    expect(service.findOwned).toHaveBeenCalledWith(
      'user-1',
      'certificate-1',
    );
  });

  it('finds a certificate for an authorized organizer', async () => {
    const result = { id: 'certificate-1' };
    service.findForOrganizer.mockResolvedValue(result as never);

    await expect(
      controller.findForOrganizer('org-1', 'certificate-1'),
    ).resolves.toEqual(result);

    expect(service.findForOrganizer).toHaveBeenCalledWith(
      'org-1',
      'certificate-1',
    );
  });

  it('downloads an owned certificate and sets response headers', async () => {
    const buffer = Buffer.from('sample-pdf');
    const file = {
      fileName: 'certificate.pdf',
      mimeType: 'application/pdf',
    };

    service.downloadOwnedCertificate.mockResolvedValue({
      file,
      buffer,
    } as never);

    const response = {
      setHeader: jest.fn(),
    };

    const result = await controller.downloadOwnedCertificate(
      { id: 'user-1' } as never,
      'certificate-1',
      response as never,
    );

    expect(service.downloadOwnedCertificate).toHaveBeenCalledWith(
      'user-1',
      'certificate-1',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="certificate.pdf"',
    );
    expect(result).toBeInstanceOf(StreamableFile);
  });
});
