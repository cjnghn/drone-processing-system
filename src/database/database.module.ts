// src/database/database.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DetectedObject, Flight, Video } from './entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'sqlite',
        database: './db.sqlite',
        entities: [Flight, Video, DetectedObject],
        synchronize: true,
        // logging: true,
      }),
    }),
    TypeOrmModule.forFeature([Flight, Video, DetectedObject]),
  ],
  providers: [],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
