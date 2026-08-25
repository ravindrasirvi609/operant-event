import { Module } from '@nestjs/common';
import { ReviewersController } from './reviewers.controller';
import { ReviewersService } from './reviewers.service';
import { ReviewAssignmentsController } from './review-assignments.controller';
import { ReviewAssignmentsService } from './review-assignments.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { ConflictOfInterestService } from './conflict-of-interest.service';

@Module({
  controllers: [
    ReviewersController,
    ReviewAssignmentsController,
    ReviewsController,
  ],
  providers: [
    ReviewersService,
    ReviewAssignmentsService,
    ReviewsService,
    ConflictOfInterestService,
  ],
  exports: [
    ReviewersService,
    ReviewAssignmentsService,
    ReviewsService,
    ConflictOfInterestService,
  ],
})
export class ReviewersModule {}
