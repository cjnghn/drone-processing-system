// src/modules/flight/types/index.ts
export interface FlightMetadata {
  name: string;
  date: Date;
  description?: string;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
  altitude: number;
}

export interface LogEntry extends GeoPoint {
  timeMs: number; // milliseconds since start
  timestamp: Date; // absolute UTC time
  compassHeading: number; // degrees
  isVideo: boolean;
}

export interface VideoSegment {
  startTimeMs: number;
  endTimeMs: number;
  startLogIndex: number;
  endLogIndex: number;
  duration: number;
  logEntries: LogEntry[]; // 세그먼트에 해당하는 로그 엔트리들
}
