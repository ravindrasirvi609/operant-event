import { ArrayNotEmpty, IsArray, IsEmail, IsString } from 'class-validator';

export class InviteMemberDto {
  @IsEmail()
  email!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roleIds!: string[];
}
