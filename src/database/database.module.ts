// src/database/database.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Flight } from './entities/flight.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Video } from './entities/video.entity';
import { Tracking } from './entities/tracking.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'sqlite',
        database: ':memory:',
        entities: [Flight, Video, Tracking],
        synchronize: configService.get<boolean>('app.database.synchronize'),
        logging: configService.get<boolean>('app.database.logging'),
      }),
    }),
  ],
  providers: [],
  exports: [],
})
export class DatabaseModule {}
