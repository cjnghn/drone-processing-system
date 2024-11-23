// src/modules/processor/services/processor.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { FlightLogProcessor } from '../../flight/services/flight-log.processor';
import { VideoTrackingProcessor } from '../../video/services/video-tracking.processor';
import { GeoreferencingProcessor } from '../../georeferencing/services/georeferencing.processor';
import {
  ProcessingResult,
  ProcessedSegment,
  ProcessedFrame,
  CameraParams,
} from '../types';
import { FlightMetadata, LogEntry } from '@/modules/flight/types';
import { TrackingFrame } from '@/modules/video/types';

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
    trackingPaths: string[],
    cameraParams: CameraParams,
  ): Promise<ProcessingResult> {
    try {
      this.logger.log(`Processing flight data: ${metadata.name}`);

      // 1. 비행 로그 처리
      const { logEntries, videoSegments } =
        await this.flightLogProcessor.processLogFile(logPath);

      if (videoSegments.length === 0) {
        throw new Error('No video segments found in flight log');
      }

      if (videoSegments.length !== trackingPaths.length) {
        throw new Error(
          `Video segment count (${videoSegments.length}) does not match tracking file count (${trackingPaths.length})`,
        );
      }

      // 2. 각 세그먼트와 트래킹 파일을 순서대로 처리
      const processedSegments: ProcessedSegment[] = await Promise.all(
        videoSegments.map(async (segment, index) => {
          // 순서대로 트래킹 파일 할당
          const trackingPath = trackingPaths[index];

          // 트래킹 데이터 처리
          const { metadata: videoMeta, frames: trackingFrames } =
            await this.videoTrackingProcessor.processTrackingFile(trackingPath);

          // 비행 로그, 트래킹 데이터, 비디오 메타데이터, 카메라 파라미터를 이용하여 프레임 처리
          const processedFrames = await this.processFrames(
            trackingFrames,
            segment.logEntries,
            segment.startTimeMs,
            videoMeta.fps,
            cameraParams,
            videoMeta.width,
            videoMeta.height,
          );

          return {
            segmentStartTime: segment.logEntries[0].timestamp,
            segmentEndTime:
              segment.logEntries[segment.logEntries.length - 1].timestamp,
            startTimeMs: segment.startTimeMs,
            endTimeMs: segment.endTimeMs,
            video: videoMeta,
            frames: processedFrames,
          };
        }),
      );

      this.logger.log(
        `Successfully processed ${processedSegments.length} video segments`,
      );

      return {
        metadata,
        segments: processedSegments,
        cameraParams,
      };
    } catch (error) {
      this.logger.error('Failed to process flight data', error);
      throw new Error(`Flight data processing failed: ${error.message}`);
    }
  }

  private async processFrames(
    trackingFrames: TrackingFrame[],
    logEntries: LogEntry[],
    segmentStartTimeMs: number,
    fps: number,
    cameraParams: CameraParams,
    imageWidth: number,
    imageHeight: number,
  ): Promise<ProcessedFrame[]> {
    return Promise.all(
      trackingFrames.map(async (frame) => {
        // 프레임 시간 계산
        const frameTimeMs = Math.floor((frame.frameIndex / fps) * 1000);
        // 비행 시작으로부터의 경과 시간
        const absoluteTimeMs = segmentStartTimeMs + frameTimeMs;

        // 해당 시점의 드론 상태 보간
        const droneState = this.georeferencingProcessor.interpolateDroneState(
          absoluteTimeMs,
          logEntries,
        );

        // 각 객체의 지리 좌표 계산
        const processedObjects = frame.objects.map((obj) => {
          const position =
            this.georeferencingProcessor.calculateObjectGeoPosition(
              obj.bbox,
              droneState,
              cameraParams,
              imageWidth,
              imageHeight,
            );

          return {
            trackId: obj.trackId,
            classId: obj.classId,
            confidence: obj.confidence,
            position,
            bbox: obj.bbox, // bbox 정보를 추가하여 디버깅에 활용
          };
        });

        return {
          frameIndex: frame.frameIndex,
          timestamp: droneState.timestamp,
          droneState,
          objects: processedObjects,
        };
      }),
    );
  }
}
