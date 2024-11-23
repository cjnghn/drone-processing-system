import { Module } from '@nestjs/common';
import { VideoTrackingProcessor } from './services/video-tracking.processor';

@Module({
  imports: [],
  providers: [VideoTrackingProcessor],
  exports: [VideoTrackingProcessor],
})
export class VideoModule {}
