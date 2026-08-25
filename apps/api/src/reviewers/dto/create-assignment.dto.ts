import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  @MinLength(1)
  abstractId!: string;

  @IsString()
  @MinLength(1)
  reviewerId!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
