import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRegistrationCategoryDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
