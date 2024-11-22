// src/domain/interfaces/drone-provider.interface.ts
import { FlightLog } from './flight-log.interface';

export interface DroneProvider {
  /**
   * 드론의 비행 로그를 읽어서 FlightLog 객체로 변환합니다.
   * @param logPath 비행 로그 파일 경로
   */
  parseFlightLog(logPath: string): Promise<FlightLog>;
}
