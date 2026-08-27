import { LocalDiskStorageProvider } from '@operant-event/storage';
import { loadEnv } from '@operant-event/config';

const env = loadEnv();

export const storage = new LocalDiskStorageProvider(env.UPLOADS_DIR);
