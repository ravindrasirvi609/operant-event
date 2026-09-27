import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

export class CreateOrganizationDto {
  // ── Organization details ────────────────────────────────────────────────────

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  slug?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  // ── Owner provisioning (required by SuperAdmin — they create an org on
  //    behalf of a customer and designate, or provision, its first owner) ──────

  /** Email address of the person who will become Organization Owner.
   *  If no account exists yet, one is created with INVITED status and a
   *  set-password email is dispatched automatically. */
  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(1)
  ownerFirstName!: string;

  @IsString()
  @MinLength(1)
  ownerLastName!: string;
}
