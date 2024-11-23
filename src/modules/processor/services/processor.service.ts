// src/modules/processor/services/processor.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { FlightLogProcessor } from '../../flight/services/flight-log.processor';
import { VideoTrackingProcessor } from '../../video/services/video-tracking.processor';
import {
  ProcessingResult,
  ProcessedVideoSegment,
  ProcessedFrame,
} from '../types';
import { FlightMetadata, LogEntry, VideoSegment } from '../../flight/types';
import { VideoMetadata, TrackingFrame } from '../../video/types';
import { GeoreferencingProcessor } from '@/modules/georeferencing/services/georeferencing.processor';

@Injectable()
export class ProcessorService {
  private readonly logger = new Logger(ProcessorService.name);

  constructor(
    private readonly flightLogProcessor: FlightLogProcessor,
    private readonly videoTrackingProcessor: VideoTrackingProcessor,
    private readonly georeferencingProcessor: GeoreferencingProcessor,
  ) {}

  async processFlightData(
    metadata: FlightMetadata,
    logPath: string,
    videoPaths: string[],
    trackingPaths: string[],
    cameraParams: {
      horizontalFov: number;
      verticalFov: number;
    },
  ): Promise<ProcessingResult> {
    this.logger.debug(`🤔 Processing flight data: ${metadata.name}`);

    // 1. Process flight log
    const { logEntries, videoSegments } =
      await this.flightLogProcessor.processLogFile(logPath);
    this.logger.debug(
      `Found ${videoSegments.length} video segments in flight log`,
    );

    // 2. Process each video and its tracking data
    const processedSegments = await this.processVideoSegments(
      videoSegments,
      videoPaths,
      trackingPaths,
      cameraParams,
    );
    this.logger.debug(`Processed ${processedSegments.length} video segments`);

    return {
      metadata,
      segments: processedSegments,
    };
  }

  private async processVideoSegments(
    segments: VideoSegment[],
    videoPaths: string[],
    trackingPaths: string[],
    cameraParams: {
      horizontalFov: number;
      verticalFov: number;
    },
  ): Promise<ProcessedVideoSegment[]> {
    const processedSegments: ProcessedVideoSegment[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const videoPath = videoPaths[i];
      const trackingPath = trackingPaths[i];

      if (!videoPath || !trackingPath) {
        this.logger.warn(`Missing video or tracking file for segment ${i}`);
        continue;
      }

      // Process tracking data
      const { metadata: videoMeta, frames } =
        await this.videoTrackingProcessor.processTrackingFile(trackingPath);

      // Match frames with log entries
      const processedSegment = await this.matchFramesWithLog(
        segment,
        videoMeta,
        frames,
        cameraParams,
      );

      processedSegments.push(processedSegment);
    }

    return processedSegments;
  }

  private async matchFramesWithLog(
    segment: VideoSegment,
    videoMeta: VideoMetadata,
    trackingFrames: TrackingFrame[],
    cameraParams: {
      horizontalFov: number;
      verticalFov: number;
    },
  ): Promise<ProcessedVideoSegment> {
    const frameInterval = 1000 / videoMeta.fps;

    const frames: ProcessedFrame[] = trackingFrames.map((frame) => {
      const frameTimeMs = Math.floor(frame.frameIndex * frameInterval);

      // 드론 위치 보간
      const dronePosition = this.georeferencingProcessor.interpolatePosition(
        frameTimeMs,
        segment.logEntries,
        segment.startTimeMs,
      );

      // 각 객체의 지리 좌표 계산
      const geoReferencedObjects = frame.objects.map((obj) => ({
        trackId: obj.trackId,
        classId: obj.classId,
        confidence: obj.confidence,
        position: this.georeferencingProcessor.calculateObjectGeoPosition(
          obj.bbox,
          dronePosition,
          {
            horizontalFov: cameraParams.horizontalFov,
            verticalFov: cameraParams.verticalFov,
            height: dronePosition.altitude,
            heading: dronePosition.heading,
          },
        ),
      }));

      return {
        frameIndex: frame.frameIndex,
        timestamp: dronePosition.timestamp,
        dronePosition,
        objects: geoReferencedObjects,
      };
    });

    return {
      segment,
      video: videoMeta,
      frames,
    };
  }
}
