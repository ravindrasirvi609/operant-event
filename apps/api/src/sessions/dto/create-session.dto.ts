import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

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

  @IsOptional()
  @IsString()
  room?: string;

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
