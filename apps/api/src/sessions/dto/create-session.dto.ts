
import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateSessionDto {
  @IsOptional()
  @IsString()
  trackId?: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @Matches(/\S/, {
    message: 'Room is required and cannot be blank.',
  })
  room!: string;

  @IsDateString()
  sessionDate!: string;

  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;

  @IsOptional()
  @IsString()
  sessionType?: string;
}
