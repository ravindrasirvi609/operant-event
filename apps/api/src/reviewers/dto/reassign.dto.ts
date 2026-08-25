import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class ReassignDto {
  @IsString()
  @MinLength(1)
  reviewerId!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
