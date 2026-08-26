import { Module } from '@nestjs/common';
import { PresentationsController } from './presentations.controller';
import { PresentationsService } from './presentations.service';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [SessionsModule],
  controllers: [PresentationsController],
  providers: [PresentationsService],
  exports: [PresentationsService],
})
export class PresentationsModule {}
