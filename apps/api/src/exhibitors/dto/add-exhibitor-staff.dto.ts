import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class AddExhibitorStaffDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
