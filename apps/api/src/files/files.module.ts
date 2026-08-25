import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { STORAGE_PROVIDER } from './storage-provider.interface';
import { LocalDiskStorageProvider } from './local-disk-storage.provider';

@Module({
  controllers: [FilesController],
  providers: [
    FilesService,
    { provide: STORAGE_PROVIDER, useClass: LocalDiskStorageProvider },
  ],
  exports: [FilesService],
})
export class FilesModule {}
