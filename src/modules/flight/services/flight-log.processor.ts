// src/modules/flight/services/flight-log.processor.ts
import { Injectable, Logger } from '@nestjs/common';
import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { LogEntry, VideoSegment } from '../types';

@Injectable()
export class FlightLogProcessor {
  private readonly logger = new Logger(FlightLogProcessor.name);

  async processLogFile(filePath: string): Promise<{
    logEntries: LogEntry[];
    videoSegments: VideoSegment[];
  }> {
    const logEntries = await this.parseLogFile(filePath);
    const videoSegments = this.extractVideoSegments(logEntries);

    return { logEntries, videoSegments };
  }

  private async parseLogFile(filePath: string): Promise<LogEntry[]> {
    return new Promise((resolve, reject) => {
      const entries: LogEntry[] = [];
      let firstTimestamp: number | null = null;

      createReadStream(filePath)
        .pipe(
          parse({
            columns: true,
            skip_empty_lines: true,
            cast: true,
          }),
        )
        .on('data', (row) => {
          const timestamp = new Date(row['datetime(utc)']);
          const timeMs = parseInt(row['time(millisecond)']);
          const altitudeFeet = parseFloat(row['ascent(feet)']);

          // 첫 타임스탬프를 기준으로 상대 시간 계산
          if (firstTimestamp === null) {
            firstTimestamp = timeMs;
          }

          entries.push({
            timeMs: timeMs - firstTimestamp,
            timestamp: timestamp,
            latitude: parseFloat(row['latitude']),
            longitude: parseFloat(row['longitude']),
            altitude: altitudeFeet * 0.3048, // Convert feet to meters
            heading: parseFloat(row['compass_heading(degrees)']),
            isVideo: Boolean(parseInt(row['isVideo'])),
          });
        })
        .on('end', () => resolve(entries))
        .on('error', reject);
    });
  }

  private extractVideoSegments(logEntries: LogEntry[]): VideoSegment[] {
    const segments: VideoSegment[] = [];
    let currentSegment: Partial<VideoSegment> | null = null;

    logEntries.forEach((entry, index) => {
      if (entry.isVideo && !currentSegment) {
        currentSegment = {
          startTimeMs: entry.timeMs,
          startLogIndex: index,
        };
      } else if (!entry.isVideo && currentSegment) {
        const endIndex = index - 1;
        const endTimeMs = logEntries[endIndex].timeMs;

        segments.push({
          startTimeMs: currentSegment.startTimeMs!,
          endTimeMs: endTimeMs,
          startLogIndex: currentSegment.startLogIndex!,
          endLogIndex: endIndex,
          duration: endTimeMs - currentSegment.startTimeMs!,
          logEntries: logEntries.slice(
            currentSegment.startLogIndex!,
            endIndex + 1,
          ),
        });

        currentSegment = null;
      }
    });

    // Handle case where video is still recording at end of log
    if (currentSegment) {
      const lastIdx = logEntries.length - 1;
      segments.push({
        startTimeMs: currentSegment.startTimeMs!,
        endTimeMs: logEntries[lastIdx].timeMs,
        startLogIndex: currentSegment.startLogIndex!,
        endLogIndex: lastIdx,
        duration: logEntries[lastIdx].timeMs - currentSegment.startTimeMs!,
        logEntries: logEntries.slice(
          currentSegment.startLogIndex!,
          lastIdx + 1,
        ),
      });
    }

    return segments;
  }
}
