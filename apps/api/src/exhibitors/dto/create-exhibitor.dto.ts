import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateExhibitorDto {
  @IsString()
  @MinLength(1)
  companyName!: string;

  @IsOptional()
  @IsString()
  boothNumber?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;
}
