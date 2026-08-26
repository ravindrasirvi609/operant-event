import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';

// Registrant-facing: any authenticated user registering for a conference.
// There is no organization context here, matching AbstractsController.
@UseGuards(JwtAuthGuard)
@Controller()
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post('conferences/:conferenceId/registrations')
  register(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conferenceId') conferenceId: string,
    @Body() dto: RegisterDto,
  ) {
    return this.registrationsService.register(
      conferenceId,
      user.id,
      dto.categoryId,
    );
  }

  @Get('registrations/:id')
  findOwned(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') registrationId: string,
  ) {
    return this.registrationsService.findOwned(user.id, registrationId);
  }
}
