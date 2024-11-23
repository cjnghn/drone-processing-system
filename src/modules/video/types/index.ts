// src/modules/video/types/index.ts
export interface VideoMetadata {
  name: string;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  durationMs: number;
}

export interface BoundingBox {
  x: number; // 중심점 x (0-1 정규화)
  y: number; // 중심점 y (0-1 정규화)
  width: number; // 너비 (0-1 정규화)
  height: number; // 높이 (0-1 정규화)
}

export interface TrackedObject {
  trackId: number; // 객체 추적 ID
  classId: number; // 객체 클래스 ID
  confidence: number; // 검출 신뢰도
  bbox: BoundingBox; // 객체 경계상자
}

/**
 * 추적 데이터 프레임
 * @property frameIndex 프레임 인덱스
 * @property objects 추적된 객체 목록
 */
export interface TrackingFrame {
  frameIndex: number;
  objects: TrackedObject[];
}

export interface TrackingData {
  metadata: VideoMetadata;
  frames: TrackingFrame[];
}
