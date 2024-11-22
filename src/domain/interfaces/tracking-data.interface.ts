// src/domain/interfaces/tracking-data.interface.ts
export interface TrackingData {
  model: ModelInfo;
  tracker: TrackerInfo;
  video: VideoMetadata;
  tracking_results: TrackingResult[];
}

export interface ModelInfo {
  name: string;
  confidence_threshold: number;
  nms: boolean;
}

export interface TrackerInfo {
  name: string;
}

export interface VideoMetadata {
  name: string;
  width: number;
  height: number;
  fps: number;
  total_frames: number;
}

export interface TrackingResult {
  i: number; // frame index
  res: Detection[];
}

export interface Detection {
  tid: number; // tracking ID
  bbox: number[]; // [x, y, width, height]
  conf: number; // confidence
  cid: number; // class ID
}
