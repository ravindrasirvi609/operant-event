
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class AssignPresentationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  abstractId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  speakerId?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  speakerName?: string;

  @IsOptional()
  @IsString()
  speakerAffiliation?: string;

  @IsOptional()
  @IsString()
  presentationType?: string;

  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
