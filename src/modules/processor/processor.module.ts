import { Module } from '@nestjs/common';
import { ProcessorService } from './services/processor.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlightModule } from '../flight/flight.module';
import { VideoModule } from '../video/video.module';
import { GeoreferencingModule } from '../georeferencing/georeferencing.module';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([]),
    DatabaseModule,
    VideoModule,
    FlightModule,
    GeoreferencingModule,
  ],
  providers: [ProcessorService],
  exports: [ProcessorService],
})
export class ProcessorModule {}
