import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

const CHECKIN_TYPES = ['MAIN_EVENT', 'WORKSHOP', 'SESSION', 'BANQUET'] as const;

export class CheckinDto {
  @IsString()
  @MinLength(1)
  conferenceId!: string;

  @IsOptional()
  @IsString()
  qrCode?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsIn(CHECKIN_TYPES)
  checkinType!: (typeof CHECKIN_TYPES)[number];

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsBoolean()
  allowReentry?: boolean;

  @IsOptional()
  @IsString()
  deviceId?: string;
}
