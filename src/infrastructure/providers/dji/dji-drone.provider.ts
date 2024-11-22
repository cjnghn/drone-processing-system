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
}
