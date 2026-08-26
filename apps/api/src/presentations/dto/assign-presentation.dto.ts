import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class AssignPresentationDto {
  @IsString()
  @MinLength(1)
  abstractId!: string;

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
