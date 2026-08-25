import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ReviewersService } from './reviewers.service';
import { AddReviewerDto } from './dto/add-reviewer.dto';
import { UpdateReviewerProfileDto } from './dto/update-reviewer-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

@Controller('reviewers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.REVIEWER_MANAGE)
export class ReviewersController {
  constructor(private readonly reviewersService: ReviewersService) {}

  @Get()
  findAll(@CurrentOrganizationId() organizationId: string) {
    return this.reviewersService.findAll(organizationId);
  }

  @Post()
  addReviewer(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: AddReviewerDto,
  ) {
    return this.reviewersService.addReviewer(organizationId, dto);
  }

  @Put(':reviewerId/profile')
  updateProfile(
    @CurrentOrganizationId() organizationId: string,
    @Param('reviewerId') reviewerId: string,
    @Body() dto: UpdateReviewerProfileDto,
  ) {
    return this.reviewersService.updateProfile(organizationId, reviewerId, dto);
  }
}
