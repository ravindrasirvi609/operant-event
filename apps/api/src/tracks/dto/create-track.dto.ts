import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTrackDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
