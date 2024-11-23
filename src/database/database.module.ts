// src/database/database.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'sqlite',
        database: ':memory:',
        entities: [],
        synchronize: configService.get<boolean>('app.database.synchronize'),
        logging: configService.get<boolean>('app.database.logging'),
      }),
    }),
  ],
  providers: [],
  exports: [],
})
export class DatabaseModule {}
