// src/config/configuration.ts
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  database: {
    type: 'sqlite' as const,
    database: process.env.DATABASE_PATH || 'db.sqlite',
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
  },
  processing: {
    defaultCameraFov: 84,
    maxVideoDuration: 3600, // 1시간
  },
}));
