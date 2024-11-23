import { Module } from '@nestjs/common';
import { ProcessorService } from './services/processor.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlightModule } from '../flight/flight.module';
import { VideoModule } from '../video/video.module';
import { GeoreferencingModule } from '../georeferencing/georeferencing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([]),
    VideoModule,
    FlightModule,
    GeoreferencingModule,
  ],
  providers: [ProcessorService],
  exports: [ProcessorService],
})
export class ProcessorModule {}
