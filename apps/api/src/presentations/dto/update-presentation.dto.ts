
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdatePresentationDto {
  @IsOptional()
  @IsString()
  speakerId?: string | null;

    @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  speakerName?: string;

  @IsOptional()
  @IsString()
  speakerAffiliation?: string;

  @IsOptional()
  @IsString()
  presentationType?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
