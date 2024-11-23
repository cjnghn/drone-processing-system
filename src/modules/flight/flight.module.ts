import { Module } from '@nestjs/common';
import { FlightLogProcessor } from './services/flight-log.processor';

@Module({
  imports: [],
  providers: [FlightLogProcessor],
  exports: [FlightLogProcessor],
})
export class FlightModule {}
