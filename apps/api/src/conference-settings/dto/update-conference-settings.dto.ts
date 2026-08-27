import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateConferenceSettingsDto {
  @IsOptional()
  @IsBoolean()
  abstractEnabled?: boolean;

  @IsOptional()
  @IsDateString()
  abstractStartDate?: string;

  @IsOptional()
  @IsDateString()
  abstractEndDate?: string;

  @IsOptional()
  @IsBoolean()
  reviewEnabled?: boolean;

  @IsOptional()
  @IsIn(['SINGLE_BLIND', 'DOUBLE_BLIND', 'OPEN'])
  reviewMode?: 'SINGLE_BLIND' | 'DOUBLE_BLIND' | 'OPEN';

  @IsOptional()
  @IsBoolean()
  registrationEnabled?: boolean;

  @IsOptional()
  @IsDateString()
  registrationStartDate?: string;

  @IsOptional()
  @IsDateString()
  registrationEndDate?: string;

  @IsOptional()
  @IsBoolean()
  paymentEnabled?: boolean;

  @IsOptional()
  @IsString()
  manualPaymentInstructions?: string;

  @IsOptional()
  @IsBoolean()
  certificateEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  checkinEnabled?: boolean;
}
