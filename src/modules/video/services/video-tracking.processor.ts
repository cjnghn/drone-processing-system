// src/modules/video/services/video-tracking.processor.ts
import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'fs/promises';
import {
  VideoMetadata,
  TrackingFrame,
  TrackedObject,
  BoundingBox,
} from '../types';

@Injectable()
export class VideoTrackingProcessor {
  private readonly logger = new Logger(VideoTrackingProcessor.name);

  async processTrackingFile(filePath: string): Promise<{
    metadata: VideoMetadata;
    frames: TrackingFrame[];
  }> {
    const data = await this.parseTrackingFile(filePath);

    const metadata: VideoMetadata = {
      fileName: data.video.name,
      width: data.video.width,
      height: data.video.height,
      fps: data.video.fps,
      totalFrames: data.video.total_frames,
      durationMs: Math.floor((data.video.total_frames / data.video.fps) * 1000),
    };

    const frames: TrackingFrame[] = data.tracking_results.map((frame) => ({
      frameIndex: frame.i,
      objects: frame.res.map((obj) => this.convertTrackedObject(obj)),
    }));

    return { metadata, frames };
  }

  private async parseTrackingFile(filePath: string): Promise<any> {
    try {
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      this.logger.error(`Failed to parse tracking file: ${filePath}`, error);
      throw new Error(`Tracking file parsing failed: ${error.message}`);
    }
  }

  private convertTrackedObject(obj: any): TrackedObject {
    const [x1, y1, x2, y2] = obj.bbox;

    // Convert to center coordinates and normalized dimensions
    const bbox: BoundingBox = {
      x: (x1 + x2) / 2,
      y: (y1 + y2) / 2,
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    };

    return {
      trackId: obj.tid,
      classId: obj.cid,
      confidence: obj.conf,
      bbox,
    };
  }
}
