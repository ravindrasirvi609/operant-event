import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

const ROLES = ['SPEAKER', 'CHAIR', 'CO_CHAIR', 'KEYNOTE'] as const;

export class SpeakerAssignmentDto {
  @IsString()
  @MinLength(1)
  speakerId!: string;

  @IsIn(ROLES)
  role!: (typeof ROLES)[number];
}

export class AssignSpeakersDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => SpeakerAssignmentDto)
  assignments!: SpeakerAssignmentDto[];
}
