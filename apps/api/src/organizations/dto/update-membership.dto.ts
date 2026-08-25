import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateMembershipDto {
  @IsOptional()
  @IsIn(['ACTIVE', 'DEACTIVATED'])
  status?: 'ACTIVE' | 'DEACTIVATED';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];
}
