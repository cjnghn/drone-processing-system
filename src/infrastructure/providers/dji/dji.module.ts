// src/infrastructure/providers/dji/dji.module.ts
import { Module } from '@nestjs/common';
import { DRONE_PROVIDER } from '@/domain/interfaces/drone-provider.interface';
import { DJIDroneProvider } from './dji-drone.provider';

@Module({
  providers: [
    {
      provide: DRONE_PROVIDER,
      useClass: DJIDroneProvider,
    },
  ],
  exports: [DRONE_PROVIDER],
})
export class DJIModule {}
