import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

const TIERS = ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE'] as const;

export class CreateSponsorDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsIn(TIERS)
  tier!: (typeof TIERS)[number];

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  logoFileId?: string;
}
