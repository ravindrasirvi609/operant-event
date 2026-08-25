import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';

// Reviewer-facing — no organization context, the reviewer acts as themselves.
@Controller('review-assignments')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post(':id/review')
  submitReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') assignmentId: string,
    @Body() dto: SubmitReviewDto,
  ) {
    return this.reviewsService.submitReviewByUserId(user.id, assignmentId, dto);
  }
}
