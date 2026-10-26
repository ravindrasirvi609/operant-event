import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ReviewAssignmentsService } from './review-assignments.service';

import { CreateAssignmentDto } from './dto/create-assignment.dto';

import { AutoAssignDto } from './dto/auto-assign.dto';

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

  // ---------------------------------------------------------
  // MANUAL ASSIGN
  // ---------------------------------------------------------

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @RequirePermissions(
    PERMISSIONS.REVIEW_ASSIGNMENT_MANAGE,
  )
  @Post(
    'conferences/:conferenceId/review-assignments',
  )
  assign(
    @CurrentOrganizationId()
    organizationId: string,

    @Param('conferenceId')
    conferenceId: string,

    @Body()
    dto: CreateAssignmentDto,
  ) {
    return this.reviewAssignmentsService.assign(
      organizationId,
      conferenceId,
      dto.abstractId,
      dto.reviewerId,
      dto.dueDate
        ? new Date(dto.dueDate)
        : undefined,
    );
  }

  // ---------------------------------------------------------
  // AUTO ASSIGN
  // ---------------------------------------------------------

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @RequirePermissions(
    PERMISSIONS.REVIEW_ASSIGNMENT_MANAGE,
  )
  @Post(
    'conferences/:conferenceId/review-assignments/auto',
  )
  autoAssign(
    @CurrentOrganizationId()
    organizationId: string,

    @Param('conferenceId')
    conferenceId: string,

    @Body()
    dto: AutoAssignDto,
  ) {
    return this.reviewAssignmentsService.autoAssign(
      organizationId,
      conferenceId,
      dto.reviewersPerAbstract,
      dto.dueDate
        ? new Date(dto.dueDate)
        : undefined,
    );
  }

  // ---------------------------------------------------------
  // REASSIGN
  // ---------------------------------------------------------

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @RequirePermissions(
    PERMISSIONS.REVIEW_ASSIGNMENT_MANAGE,
  )
  @Post(
    'review-assignments/:id/reassign',
  )
  reassign(
    @CurrentOrganizationId()
    organizationId: string,

    @Param('id')
    assignmentId: string,

    @Body()
    dto: ReassignDto,
  ) {
    return this.reviewAssignmentsService.reassign(
      organizationId,
      assignmentId,
      dto.reviewerId,
      dto.dueDate
        ? new Date(dto.dueDate)
        : undefined,
    );
  }

  // ---------------------------------------------------------
  // DASHBOARD
  // ---------------------------------------------------------

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @RequirePermissions(
    PERMISSIONS.ABSTRACT_READ,
  )
  @Get(
    'conferences/:conferenceId/review-assignments/dashboard',
  )
  dashboard(
    @CurrentOrganizationId()
    organizationId: string,

    @Param('conferenceId')
    conferenceId: string,
  ) {
    return this.reviewAssignmentsService.dashboard(
      organizationId,
      conferenceId,
    );
  }

  // ---------------------------------------------------------
  // ABSTRACT REVIEWS
  // ---------------------------------------------------------

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @RequirePermissions(
    PERMISSIONS.ABSTRACT_READ,
  )
  @Get(
    'conferences/:conferenceId/abstracts/:abstractId/reviews',
  )
  findReviewsForAbstract(
    @CurrentOrganizationId()
    organizationId: string,

    @Param('conferenceId')
    conferenceId: string,

    @Param('abstractId')
    abstractId: string,
  ) {
    return this.reviewAssignmentsService.findReviewsForAbstract(
      organizationId,
      conferenceId,
      abstractId,
    );
  }

  // ---------------------------------------------------------
  // CONFLICT CHECK
  // ---------------------------------------------------------

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @RequirePermissions(
    PERMISSIONS.REVIEW_ASSIGNMENT_MANAGE,
  )
  @Get(
    'conferences/:conferenceId/reviewers/:reviewerId/conflict-check',
  )
  checkConflict(
    @Param('reviewerId')
    reviewerId: string,

    @Query('abstractId')
    abstractId: string,
  ) {
    return this.reviewAssignmentsService.checkConflict(
      reviewerId,
      abstractId,
    );
  }

  // ---------------------------------------------------------
  // REVIEWER PORTAL
  // ---------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Get(
    'review-assignments/mine',
  )
  findMine(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.reviewAssignmentsService.findMineByUserId(
      user.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(
    'review-assignments/:id/decline',
  )
  decline(
    @CurrentUser()
    user: AuthenticatedUser,

    @Param('id')
    assignmentId: string,
  ) {
    return this.reviewAssignmentsService.declineByUserId(
      user.id,
      assignmentId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(
    'review-assignments/:id/declare-conflict',
  )
  declareConflict(
    @CurrentUser()
    user: AuthenticatedUser,

    @Param('id')
    assignmentId: string,
  ) {
    return this.reviewAssignmentsService.declareConflictByUserId(
      user.id,
      assignmentId,
    );
  }
}