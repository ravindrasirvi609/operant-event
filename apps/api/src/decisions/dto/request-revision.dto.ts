import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class RequestRevisionDto {
  @IsString()
  @MinLength(1)
  reason!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
