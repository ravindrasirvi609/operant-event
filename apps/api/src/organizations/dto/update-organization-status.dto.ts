import { IsIn } from 'class-validator';

/**
 * Platform Super Admin only. Restricted to ACTIVE/SUSPENDED — "activate" and
 * "deactivate" in plain terms. ARCHIVED is a separate end-of-life state, not
 * part of this toggle.
 */
export class UpdateOrganizationStatusDto {
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status!: 'ACTIVE' | 'SUSPENDED';
}
