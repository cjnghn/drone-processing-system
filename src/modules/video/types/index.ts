// src/modules/video/types/index.ts
export interface VideoMetadata {
  fileName: string;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  durationMs: number;
}

export interface TrackedObject {
  trackId: number; // Unique ID for tracked object
  classId: number; // Object class ID
  confidence: number; // Detection confidence
  bbox: BoundingBox; // Normalized coordinates [0-1]
}

export interface BoundingBox {
  x: number; // Center X
  y: number; // Center Y
  width: number; // Width
  height: number; // Height
}

export interface TrackingFrame {
  frameIndex: number;
  objects: TrackedObject[];
}
