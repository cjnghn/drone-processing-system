// src/domain/interfaces/drone-provider.interface.ts
import { FlightLog } from './flight-log.interface';
import { TrackingData } from './tracking-data.interface';

export const DRONE_PROVIDER = 'DRONE_PROVIDER';

export interface DroneProvider {
  parseFlightLog(logPath: string): Promise<FlightLog>;
  parseTrackingData(trackingPath: string): Promise<TrackingData>;
  mapFrameToTime(
    frameIndex: number,
    fps: number,
    segmentStartTime: number,
  ): number;
}
