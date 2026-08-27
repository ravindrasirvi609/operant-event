import { BadRequestException } from '@nestjs/common';
import { assertMatchingOrganizationId } from './assert-matching-organization-id.util';

describe('assertMatchingOrganizationId', () => {
  it('does not throw when the path and header organization ids match', () => {
    expect(() => assertMatchingOrganizationId('org-1', 'org-1')).not.toThrow();
  });

  it('throws BadRequestException when the path and header organization ids disagree', () => {
    expect(() => assertMatchingOrganizationId('org-1', 'org-2')).toThrow(
      BadRequestException,
    );
  });
});
