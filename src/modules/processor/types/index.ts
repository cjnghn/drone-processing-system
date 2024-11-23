import { VideoSegment, GeoPoint, FlightMetadata } from '@/modules/flight/types';
import {
  GeoReferencedPoint,
  GeoReferencedObject,
} from '@/modules/georeferencing/types';
import { VideoMetadata, TrackedObject } from '@/modules/video/types';

// src/modules/processor/types/index.ts
export interface ProcessedVideoSegment {
  segment: VideoSegment;
  video: VideoMetadata;
  frames: ProcessedFrame[];
}

export interface ProcessedFrame {
  frameIndex: number;
  timestamp: Date;
  dronePosition: GeoReferencedPoint;
  objects: GeoReferencedObject[];
}

export interface ProcessingResult {
  metadata: FlightMetadata;
  segments: ProcessedVideoSegment[];
}
