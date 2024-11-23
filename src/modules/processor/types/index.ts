// src/modules/processor/types/index.ts
import { FlightMetadata } from '@/modules/flight/types';
import { BoundingBox, VideoMetadata } from '@/modules/video/types';
import {
  DroneState,
  GeoReferencedObject,
} from '@/modules/georeferencing/types';

export interface CameraParams {
  horizontalFov: number; // 수평 화각 (도)
  verticalFov: number; // 수직 화각 (도)
}

export interface ProcessedObject {
  trackId: number;
  classId: number;
  confidence: number;
  bbox: BoundingBox;
  position: GeoReferencedObject;
}

export interface ProcessedFrame {
  frameIndex: number; // 비디오 프레임 인덱스
  timestamp: Date; // 절대 시간
  droneState: DroneState; // 해당 시점의 드론 상태
  objects: ProcessedObject[];
}

/**
 * 비디오 세그먼트 처리 결과
 * @property segmentStartTime 세그먼트 시작 시간
 * @property segmentEndTime 세그먼트 종료 시간
 * @property video 비디오 메타데이터
 * @property frames 프레임 처리 결과
 */
export interface ProcessedSegment {
  segmentStartTime: Date;
  segmentEndTime: Date;
  video: VideoMetadata;
  frames: ProcessedFrame[];
}

export interface ProcessingResult {
  metadata: FlightMetadata;
  segments: ProcessedSegment[];
  cameraParams: CameraParams;
}
