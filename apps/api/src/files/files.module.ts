import { Module } from '@nestjs/common';
import type { Env } from '@operant-event/config';
import {
  LocalDiskStorageProvider,
  STORAGE_PROVIDER,
} from '@operant-event/storage';
import { ENV } from '../common/env/env.module';
import { FilesController, SelfServeFilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  controllers: [FilesController, SelfServeFilesController],
  providers: [
    FilesService,
    {
      provide: STORAGE_PROVIDER,
      useFactory: (env: Env) => new LocalDiskStorageProvider(env.UPLOADS_DIR),
      inject: [ENV],
    },
  ],
  exports: [FilesService],
})
export class FilesModule {}
