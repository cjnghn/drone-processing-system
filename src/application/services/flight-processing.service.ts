// src/application/services/flight-processing.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  FlightCoordinate,
  FlightSegment,
} from '@/domain/interfaces/flight-log.interface';
import {
  Detection,
  TrackingData,
} from '@/domain/interfaces/tracking-data.interface';
import {
  DRONE_PROVIDER,
  DroneProvider,
} from '@/domain/interfaces/drone-provider.interface';

export interface ProcessedFrame {
  frameIndex: number;
  elapsedTime: number;
  detections: ProcessedDetection[];
  dronePosition: FlightCoordinate;
}

export interface ProcessedDetection extends Detection {
  normalizedPosition: {
    x: number; // 0-1 범위
    y: number; // 0-1 범위
  };
}

@Injectable()
export class FlightProcessingService {
  private readonly logger = new Logger(FlightProcessingService.name);

  constructor(
    @Inject(DRONE_PROVIDER)
    private readonly droneProvider: DroneProvider,
  ) {}

  async processVideoSegment(
    segment: FlightSegment,
    trackingPath: string,
  ): Promise<ProcessedFrame[]> {
    try {
      const trackingData =
        await this.droneProvider.parseTrackingData(trackingPath);
      return this.processFrames(segment, trackingData);
    } catch (error) {
      this.logger.error('Failed to process video segment', error);
      throw error;
    }
  }

  private processFrames(
    segment: FlightSegment,
    trackingData: TrackingData,
  ): ProcessedFrame[] {
    const processedFrames: ProcessedFrame[] = [];

    for (const result of trackingData.tracking_results) {
      const elapsedTime = this.droneProvider.mapFrameToTime(
        result.i,
        trackingData.video.fps,
        segment.startTime.elapsed,
      );

      // 세그먼트 시간 범위 검증
      if (
        elapsedTime < segment.startTime.elapsed ||
        elapsedTime > segment.endTime.elapsed
      ) {
        this.logger.debug(
          `Skipping frame ${result.i} as it's outside segment time range ` +
            `(${segment.startTime.elapsed} - ${segment.endTime.elapsed})`,
        );
        continue;
      }

      const dronePosition = this.interpolatePosition(
        segment.coordinates,
        elapsedTime,
      );

      if (!dronePosition) {
        this.logger.warn(
          `Could not interpolate position for frame ${result.i}`,
        );
        continue;
      }

      const processedDetections = result.res.map((detection) => ({
        ...detection,
        normalizedPosition: {
          x:
            (detection.bbox[0] + detection.bbox[2] / 2) /
            trackingData.video.width,
          y:
            (detection.bbox[1] + detection.bbox[3] / 2) /
            trackingData.video.height,
        },
      }));

      processedFrames.push({
        frameIndex: result.i,
        elapsedTime,
        detections: processedDetections,
        dronePosition,
      });
    }

    return processedFrames;
  }

  private interpolatePosition(
    coordinates: FlightCoordinate[],
    targetTime: number,
  ): FlightCoordinate | null {
    // 범위 체크
    if (
      targetTime < coordinates[0].elapsed ||
      targetTime > coordinates[coordinates.length - 1].elapsed
    ) {
      return null;
    }

    // 이진 검색으로 가장 가까운 두 좌표 찾기
    let left = 0;
    let right = coordinates.length - 1;

    while (left < right - 1) {
      const mid = Math.floor((left + right) / 2);
      if (coordinates[mid].elapsed === targetTime) {
        return coordinates[mid];
      }
      if (coordinates[mid].elapsed < targetTime) {
        left = mid;
      } else {
        right = mid;
      }
    }

    const t =
      (targetTime - coordinates[left].elapsed) /
      (coordinates[right].elapsed - coordinates[left].elapsed);

    return {
      elapsed: targetTime,
      utc: new Date(
        coordinates[left].utc.getTime() +
          (coordinates[right].utc.getTime() - coordinates[left].utc.getTime()) *
            t,
      ),
      latitude: this.lerp(
        coordinates[left].latitude,
        coordinates[right].latitude,
        t,
      ),
      longitude: this.lerp(
        coordinates[left].longitude,
        coordinates[right].longitude,
        t,
      ),
      altitude: this.lerp(
        coordinates[left].altitude,
        coordinates[right].altitude,
        t,
      ),
      heading: this.interpolateHeading(
        coordinates[left].heading,
        coordinates[right].heading,
        t,
      ),
    };
  }

  private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  private interpolateHeading(start: number, end: number, t: number): number {
    // 각도 차이 계산 (최단 경로)
    let diff = end - start;

    // 360도를 넘는 경우 처리
    if (Math.abs(diff) > 180) {
      if (diff > 0) {
        diff = diff - 360;
      } else {
        diff = diff + 360;
      }
    }

    // 선형 보간
    let result = start + diff * t;

    // 결과값을 0-360 범위로 정규화
    while (result >= 360) result -= 360;
    while (result < 0) result += 360;

    return result;
  }
}
