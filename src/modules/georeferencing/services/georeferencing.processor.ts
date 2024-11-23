// src/modules/georeferencing/services/georeferencing.processor.ts
import { Injectable, Logger } from '@nestjs/common';
import { GeoPoint, LogEntry } from '../../flight/types';
import {
  GeoReferencedBbox,
  GeoReferencedPoint,
  InterpolatedPosition,
} from '../types';
import { BoundingBox } from '@/modules/video/types';

@Injectable()
export class GeoreferencingProcessor {
  private readonly logger = new Logger(GeoreferencingProcessor.name);
  private readonly EARTH_RADIUS_METERS = 6371000;

  /**
   * 비디오 프레임 시간에 맞는 위치 정보를 보간하여 계산
   */
  interpolatePosition(
    frameTimeMs: number,
    logEntries: LogEntry[],
    segmentStartTimeMs: number,
  ): InterpolatedPosition {
    const absoluteTimeMs = segmentStartTimeMs + frameTimeMs;

    // 주어진 시간에 가장 가까운 로그 엔트리 두 개 찾기
    const { before, after } = this.findSurroundingLogEntries(
      logEntries,
      absoluteTimeMs,
    );

    // 정확히 일치하는 시간의 로그가 있는 경우
    if (before.timeMs === absoluteTimeMs) {
      return {
        ...this.convertToGeoPoint(before),
        interpolationWeight: 1,
      };
    }

    // 두 시점 사이에서 보간
    const weight = this.calculateInterpolationWeight(
      absoluteTimeMs,
      before.timeMs,
      after.timeMs,
    );

    return {
      latitude: this.interpolateValue(before.latitude, after.latitude, weight),
      longitude: this.interpolateValue(
        before.longitude,
        after.longitude,
        weight,
      ),
      altitude: this.interpolateValue(before.altitude, after.altitude, weight),
      heading: this.interpolateHeading(
        before.compassHeading,
        after.compassHeading,
        weight,
      ),
      timestamp: new Date(
        before.timestamp.getTime() +
          (after.timestamp.getTime() - before.timestamp.getTime()) * weight,
      ),
      timeMs: absoluteTimeMs,
      interpolationWeight: weight,
    };
  }

  /**
   * 프레임 시간을 기준으로 앞뒤 로그 엔트리 찾기
   */
  private findSurroundingLogEntries(
    logEntries: LogEntry[],
    targetTimeMs: number,
  ): { before: LogEntry; after: LogEntry } {
    let beforeIndex = 0;
    let afterIndex = 1;

    // 이진 검색으로 적절한 구간 찾기
    while (afterIndex < logEntries.length) {
      if (
        logEntries[beforeIndex].timeMs <= targetTimeMs &&
        logEntries[afterIndex].timeMs >= targetTimeMs
      ) {
        break;
      }
      beforeIndex++;
      afterIndex++;
    }

    // 범위를 벗어난 경우 처리
    if (afterIndex >= logEntries.length) {
      beforeIndex = logEntries.length - 2;
      afterIndex = logEntries.length - 1;
    }

    return {
      before: logEntries[beforeIndex],
      after: logEntries[afterIndex],
    };
  }

  /**
   * 보간 가중치 계산 (0-1 사이 값)
   */
  private calculateInterpolationWeight(
    targetTime: number,
    beforeTime: number,
    afterTime: number,
  ): number {
    return (targetTime - beforeTime) / (afterTime - beforeTime);
  }

  /**
   * 선형 보간
   */
  private interpolateValue(start: number, end: number, weight: number): number {
    return start + (end - start) * weight;
  }

  /**
   * 방향(heading) 보간 - 360도 WrappAround 고려
   */
  private interpolateHeading(
    start: number,
    end: number,
    weight: number,
  ): number {
    let diff = end - start;

    // 360도 교차점 처리
    if (diff > 180) {
      diff -= 360;
    } else if (diff < -180) {
      diff += 360;
    }

    let result = start + diff * weight;

    // 결과값을 0-360 범위로 정규화
    if (result >= 360) {
      result -= 360;
    } else if (result < 0) {
      result += 360;
    }

    return result;
  }

  /**
   * 로그 엔트리를 GeoPoint로 변환
   */
  private convertToGeoPoint(entry: LogEntry): GeoReferencedPoint {
    return {
      latitude: entry.latitude,
      longitude: entry.longitude,
      altitude: entry.altitude,
      heading: entry.compassHeading,
      timestamp: entry.timestamp,
      timeMs: entry.timeMs,
    };
  }

  /**
   * 객체의 bbox를 지리 좌표로 변환
   */
  calculateObjectGeoPosition(
    bbox: BoundingBox,
    dronePosition: GeoReferencedPoint,
    cameraParams: {
      horizontalFov: number; // 수평 화각 (도)
      verticalFov: number; // 수직 화각 (도)
      height: number; // 비행 고도 (미터)
      heading: number; // 드론 heading (도)
    },
  ): GeoReferencedBbox {
    // 1. 이미지 상의 좌표를 실제 거리로 변환
    const distances = this.calculateDistancesFromDrone(
      bbox,
      cameraParams.horizontalFov,
      cameraParams.verticalFov,
      cameraParams.height,
    );

    // 2. 드론 heading을 고려하여 실제 방향 계산
    const bearings = this.calculateBearings(distances, cameraParams.heading);

    // 3. 각 점의 지리 좌표 계산
    const corners = {
      topLeft: this.calculateDestinationPoint(
        dronePosition,
        bearings.topLeft,
        distances.topLeft,
      ),
      topRight: this.calculateDestinationPoint(
        dronePosition,
        bearings.topRight,
        distances.topRight,
      ),
      bottomLeft: this.calculateDestinationPoint(
        dronePosition,
        bearings.bottomLeft,
        distances.bottomLeft,
      ),
      bottomRight: this.calculateDestinationPoint(
        dronePosition,
        bearings.bottomRight,
        distances.bottomRight,
      ),
    };

    // 4. 중심점 계산
    const center = this.calculateDestinationPoint(
      dronePosition,
      bearings.center,
      distances.center,
    );

    return {
      center,
      corners,
      originalBbox: bbox,
    };
  }

  /**
   * 이미지 상의 좌표를 드론으로부터의 실제 거리로 변환
   */
  private calculateDistancesFromDrone(
    bbox: BoundingBox,
    horizontalFov: number,
    verticalFov: number,
    height: number,
  ) {
    // 화각을 라디안으로 변환
    const hFovRad = (horizontalFov * Math.PI) / 180;
    const vFovRad = (verticalFov * Math.PI) / 180;

    // 이미지 중심으로부터의 각도 계산
    const angleX = (bbox.x - 0.5) * hFovRad;
    const angleY = (bbox.y - 0.5) * vFovRad;

    // 실제 거리 계산 (탄젠트 사용)
    const distanceX = height * Math.tan(angleX);
    const distanceY = height * Math.tan(angleY);

    // bbox의 각 모서리에 대한 거리 계산
    const halfWidth = (bbox.width * hFovRad) / 2;
    const halfHeight = (bbox.height * vFovRad) / 2;

    return {
      center: Math.sqrt(distanceX ** 2 + distanceY ** 2),
      topLeft: Math.sqrt(
        (distanceX - halfWidth) ** 2 + (distanceY - halfHeight) ** 2,
      ),
      topRight: Math.sqrt(
        (distanceX + halfWidth) ** 2 + (distanceY - halfHeight) ** 2,
      ),
      bottomLeft: Math.sqrt(
        (distanceX - halfWidth) ** 2 + (distanceY + halfHeight) ** 2,
      ),
      bottomRight: Math.sqrt(
        (distanceX + halfWidth) ** 2 + (distanceY + halfHeight) ** 2,
      ),
    };
  }

  /**
   * 드론 heading을 고려한 실제 방향 계산
   */
  private calculateBearings(
    distances: Record<string, number>,
    droneHeading: number,
  ) {
    const headingRad = (droneHeading * Math.PI) / 180;

    return {
      center: headingRad,
      topLeft: headingRad - Math.atan2(distances.topLeft, distances.center),
      topRight: headingRad + Math.atan2(distances.topRight, distances.center),
      bottomLeft:
        headingRad - Math.atan2(distances.bottomLeft, distances.center),
      bottomRight:
        headingRad + Math.atan2(distances.bottomRight, distances.center),
    };
  }

  /**
   * 시작점, 방향, 거리를 이용하여 도착점의 지리 좌표 계산
   */
  private calculateDestinationPoint(
    start: GeoReferencedPoint,
    bearing: number,
    distance: number,
  ): GeoPoint {
    const startLatRad = (start.latitude * Math.PI) / 180;
    const startLonRad = (start.longitude * Math.PI) / 180;

    const angularDistance = distance / this.EARTH_RADIUS_METERS;

    const destinationLatRad = Math.asin(
      Math.sin(startLatRad) * Math.cos(angularDistance) +
        Math.cos(startLatRad) * Math.sin(angularDistance) * Math.cos(bearing),
    );

    const destinationLonRad =
      startLonRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(startLatRad),
        Math.cos(angularDistance) -
          Math.sin(startLatRad) * Math.sin(destinationLatRad),
      );

    return {
      latitude: (destinationLatRad * 180) / Math.PI,
      longitude: (destinationLonRad * 180) / Math.PI,
      altitude: start.altitude,
    };
  }
}
