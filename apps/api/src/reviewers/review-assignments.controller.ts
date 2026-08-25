import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ReviewAssignmentsService } from './review-assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ReassignDto } from './dto/reassign.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { CurrentOrganizationId } from '../common/decorators/current-organization.decorator';
import { PERMISSIONS } from '../common/permissions/permissions.catalogue';

@Controller()
export class ReviewAssignmentsController {
  constructor(
    private readonly reviewAssignmentsService: ReviewAssignmentsService,
  ) {}

  // Organizer-facing.
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.REVIEW_ASSIGNMENT_MANAGE)
  @Post('conferences/:conferenceId/review-assignments')
  assign(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.reviewAssignmentsService.assign(
      organizationId,
      conferenceId,
      dto.abstractId,
      dto.reviewerId,
      dto.dueDate ? new Date(dto.dueDate) : undefined,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.REVIEW_ASSIGNMENT_MANAGE)
  @Post('review-assignments/:id/reassign')
  reassign(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') assignmentId: string,
    @Body() dto: ReassignDto,
  ) {
    return this.reviewAssignmentsService.reassign(
      organizationId,
      assignmentId,
      dto.reviewerId,
      dto.dueDate ? new Date(dto.dueDate) : undefined,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ABSTRACT_READ)
  @Get('conferences/:conferenceId/review-assignments/dashboard')
  dashboard(
    @CurrentOrganizationId() organizationId: string,
    @Param('conferenceId') conferenceId: string,
  ) {
    return this.reviewAssignmentsService.dashboard(
      organizationId,
      conferenceId,
    );
  }

  // Reviewer-facing — the reviewer acts as themselves, no organization context.
  @UseGuards(JwtAuthGuard)
  @Get('review-assignments/mine')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.reviewAssignmentsService.findMineByUserId(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('review-assignments/:id/decline')
  decline(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') assignmentId: string,
  ) {
    return this.reviewAssignmentsService.declineByUserId(user.id, assignmentId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('review-assignments/:id/declare-conflict')
  declareConflict(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') assignmentId: string,
  ) {
    return this.reviewAssignmentsService.declareConflictByUserId(
      user.id,
      assignmentId,
    );
  }
}
