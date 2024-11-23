// src/modules/video/services/video-tracking.processor.ts
import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'fs/promises';
import {
  VideoMetadata,
  TrackingFrame,
  TrackingData,
  BoundingBox,
} from '../types';


@Injectable()
export class VideoTrackingProcessor {
  private readonly logger = new Logger(VideoTrackingProcessor.name);

  async processTrackingFile(filePath: string): Promise<TrackingData> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const rawData = JSON.parse(content);

      // 메타데이터 추출 및 변환
      const metadata = this.extractVideoMetadata(rawData.video);

      // 프레임 데이터 변환
      const frames = this.convertTrackingResults(rawData.tracking_results);

      this.logger.debug(
        `Processed tracking data: ${metadata.name}, ${frames.length} frames`,
      );

      return { metadata, frames };
    } catch (error) {
      this.logger.error(`Failed to process tracking file: ${filePath}`, error);
      throw new Error(`Tracking data processing failed: ${error.message}`);
    }
  }

  private extractVideoMetadata(videoData: any): VideoMetadata {
    if (!this.isValidVideoData(videoData)) {
      throw new Error('Invalid video metadata format');
    }

    return {
      name: videoData.name,
      width: videoData.width,
      height: videoData.height,
      fps: videoData.fps,
      totalFrames: videoData.total_frames,
      durationMs: Math.floor((videoData.total_frames / videoData.fps) * 1000),
    };
  }

  private convertTrackingResults(results: any[]): TrackingFrame[] {
    if (!Array.isArray(results)) {
      throw new Error('Tracking results must be an array');
    }

    return results.map((frame) => ({
      frameIndex: frame.i,
      objects: frame.res.map((obj) => ({
        trackId: obj.tid,
        classId: obj.cid,
        confidence: obj.conf,
        bbox: this.convertBoundingBox(obj.bbox),
      })),
    }));
  }

  private convertBoundingBox(bbox: number[]): BoundingBox {
    if (!Array.isArray(bbox) || bbox.length !== 4) {
      this.logger.debug(`Invalid bounding box format: ${bbox}`);
      throw new Error('Invalid bounding box format');
    }

    const [x1, y1, x2, y2] = bbox;
    return {
      x: (x1 + x2) / 2,
      y: (y1 + y2) / 2,
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    };
  }

  private isValidVideoData(data: any): boolean {
    return (
      data &&
      typeof data.name === 'string' &&
      typeof data.width === 'number' &&
      typeof data.height === 'number' &&
      typeof data.fps === 'number' &&
      typeof data.total_frames === 'number'
    );
  }
}
