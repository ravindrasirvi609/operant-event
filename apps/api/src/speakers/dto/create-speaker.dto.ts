import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSpeakerDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  institution?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  photoFileId?: string;

  @IsOptional()
  @IsString()
  country?: string;
}
