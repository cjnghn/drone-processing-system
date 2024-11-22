// src/domain/interfaces/flight-log.interface.ts
export interface RawFlightLogRecord {
  'time(milliseond)': string;
  'datetime(utc)': string;
  latitude: string;
  longitude: string;
  'ascent(feet)': string;
  'compass_heading(degrees)': string;
  isVideo: string;
}

export interface FlightLog {
  segments: FlightSegment[];
  metadata: FlightMetadata;
}

export interface FlightSegment {
  startTime: TimeInfo;
  endTime: TimeInfo;
  coordinates: FlightCoordinate[]; // sorted by elapsed time
}

export interface TimeInfo {
  elapsed: number; // milliseconds from flight start
  utc: Date;
}

export interface FlightCoordinate {
  elapsed: number;
  utc: Date;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
}

export interface FlightMetadata {
  startTime: Date;
  endTime: Date;
  totalDuration: number; // milliseconds
}
