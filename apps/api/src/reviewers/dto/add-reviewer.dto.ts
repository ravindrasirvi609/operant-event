import { IsString, MinLength } from 'class-validator';

export class AddReviewerDto {
  @IsString()
  @MinLength(1)
  userId!: string;
}
