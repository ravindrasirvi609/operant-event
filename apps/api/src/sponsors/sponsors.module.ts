
import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { SponsorsController } from './sponsors.controller';
import { PublicSponsorsController } from './public-sponsors.controller';
import { SponsorsService } from './sponsors.service';

@Module({
  imports: [FilesModule],
  controllers: [
    SponsorsController,
    PublicSponsorsController,
  ],
  providers: [SponsorsService],
  exports: [SponsorsService],
})
export class SponsorsModule {}
