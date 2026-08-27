import { IsEmail, IsString, MinLength, ValidateIf } from 'class-validator';

/**
 * There is no user-search endpoint — exactly one of `userId`/`email`
 * must be given; `email` resolves to the matching user internally
 * rather than requiring the caller to already know their internal id.
 */
export class AddReviewerDto {
  @ValidateIf((dto: AddReviewerDto) => !dto.email)
  @IsString()
  @MinLength(1)
  userId?: string;

  @ValidateIf((dto: AddReviewerDto) => !dto.userId)
  @IsEmail()
  email?: string;
}
