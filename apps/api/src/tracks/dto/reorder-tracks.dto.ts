import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class ReorderTracksDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  trackIds!: string[];
}
