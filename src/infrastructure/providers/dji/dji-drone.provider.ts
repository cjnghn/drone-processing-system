import { Injectable, Logger } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs/promises';
import { DroneProvider } from 'src/domain/interfaces/drone-provider.interface';
import {
  FlightLog,
  RawFlightLogRecord,
  FlightSegment,
  FlightCoordinate,
} from 'src/domain/interfaces/flight-log.interface';
import { TrackingData } from 'src/domain/interfaces/tracking-data.interface';

@Injectable()
export class DJIDroneProvider implements DroneProvider {
  private readonly logger = new Logger(DJIDroneProvider.name);

  async parseFlightLog(logPath: string): Promise<FlightLog> {
    try {
      const fileContent = await fs.readFile(logPath, 'utf-8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
      }) as RawFlightLogRecord[];

      const segments: FlightSegment[] = [];
      let currentSegment: Partial<FlightSegment> | null = null;

      // 첫 레코드 시간을 기준으로 설정
      const firstRecord = records[0];
      const startTime = new Date(firstRecord['datetime(utc)']);
      const baseElapsedTime = parseInt(firstRecord['time(milliseond)']);

      for (const record of records) {
        const elapsedTime =
          parseInt(record['time(milliseond)']) - baseElapsedTime;
        const utcTime = new Date(record['datetime(utc)']);

        const coordinate: FlightCoordinate = {
          elapsed: elapsedTime,
          utc: utcTime,
          latitude: parseFloat(record.latitude),
          longitude: parseFloat(record.longitude),
          altitude: this.feetToMeters(parseFloat(record['ascent(feet)'])),
          heading: parseFloat(record['compass_heading(degrees)']),
        };

        // 비디오 세그먼트 처리
        if (record.isVideo === '1') {
          if (!currentSegment) {
            currentSegment = {
              startTime: {
                elapsed: elapsedTime,
                utc: utcTime,
              },
              coordinates: [],
            };
          }
          currentSegment.coordinates!.push(coordinate);
          currentSegment.endTime = {
            elapsed: elapsedTime,
            utc: utcTime,
          };
        }
        // 비디오 세그먼트가 끝날 때
        else if (record.isVideo === '0' && currentSegment) {
          segments.push(currentSegment as FlightSegment);
          currentSegment = null;
        }
      }

      // 마지막 세그먼트 처리
      if (currentSegment) {
        segments.push(currentSegment as FlightSegment);
      }

      const lastRecord = records[records.length - 1];
      const endTime = new Date(lastRecord['datetime(utc)']);
      const totalDuration =
        parseInt(lastRecord['time(milliseond)']) - baseElapsedTime;

      return {
        segments,
        metadata: {
          startTime,
          endTime,
          totalDuration,
        },
      };
    } catch (error) {
      this.logger.error('Failed to parse flight log', error);
      throw new Error(`Failed to parse flight log: ${error.message}`);
    }
  }

  private feetToMeters(feet: number): number {
    return feet * 0.3048;
  }

  async parseTrackingData(trackingPath: string): Promise<TrackingData> {
    try {
      const fileContent = await fs.readFile(trackingPath, 'utf-8');
      const data = JSON.parse(fileContent);

      this.validateTrackingData(data);

      return data;
    } catch (error) {
      this.logger.error('Failed to parse tracking data', error);
      throw new Error(`Failed to parse tracking data: ${error.message}`);
    }
  }

  mapFrameToTime(
    frameIndex: number,
    fps: number,
    segmentStartTime: number,
  ): number {
    // 프레임 인덱스를 밀리초 단위 시간으로 변환
    const frameTime = (frameIndex / fps) * 1000;
    return segmentStartTime + frameTime;
  }

  private validateTrackingData(data: any): asserts data is TrackingData {
    if (
      !data.model?.name ||
      typeof data.model.confidence_threshold !== 'number' ||
      typeof data.model.nms !== 'boolean'
    ) {
      throw new Error('Invalid model information');
    }

    if (!data.tracker?.name) {
      throw new Error('Invalid tracker information');
    }

    if (
      !data.video?.width ||
      !data.video?.height ||
      !data.video?.fps ||
      !data.video?.total_frames
    ) {
      throw new Error('Invalid video metadata');
    }

    if (!Array.isArray(data.tracking_results)) {
      throw new Error('Invalid tracking results');
    }

    // 각 트래킹 결과의 형식 검증
    data.tracking_results.forEach((result, index) => {
      if (typeof result.i !== 'number' || !Array.isArray(result.res)) {
        throw new Error(`Invalid tracking result at index ${index}`);
      }

      result.res.forEach((detection, detIndex) => {
        if (
          !Array.isArray(detection.bbox) ||
          detection.bbox.length !== 4 ||
          typeof detection.conf !== 'number' ||
          typeof detection.tid !== 'number' ||
          typeof detection.cid !== 'number'
        ) {
          throw new Error(
            `Invalid detection at frame ${result.i}, detection ${detIndex}`,
          );
        }
      });
    });
  }
}
