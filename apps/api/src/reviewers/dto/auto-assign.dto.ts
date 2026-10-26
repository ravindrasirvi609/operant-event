import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class AutoAssignDto {
  @IsInt()
  @Min(1)
  @Max(3)
  @Type(() => Number)
  reviewersPerAbstract: number = 1;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}