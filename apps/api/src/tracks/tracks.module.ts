import { Module } from '@nestjs/common';
import {
  TracksController,
  SubmissionTracksController,
} from './tracks.controller';
import { TracksService } from './tracks.service';

@Module({
  controllers: [TracksController, SubmissionTracksController],
  providers: [TracksService],
  exports: [TracksService],
})
export class TracksModule {}
