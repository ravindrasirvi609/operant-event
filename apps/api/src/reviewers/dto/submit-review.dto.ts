import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const RECOMMENDATIONS = [
  'ACCEPT',
  'REJECT',
  'MINOR_REVISION',
  'MAJOR_REVISION',
] as const;

export class SubmitReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  overallScore!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  originalityScore!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  methodologyScore!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  significanceScore!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  presentationScore!: number;

  @IsOptional()
  @IsString()
  commentsToAuthor?: string;

  @IsOptional()
  @IsString()
  privateComments?: string;

  @IsIn(RECOMMENDATIONS)
  recommendation!: (typeof RECOMMENDATIONS)[number];
}
