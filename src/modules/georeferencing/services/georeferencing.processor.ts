// src/modules/georeferencing/services/georeferencing.processor.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  DroneState,
  GeoPoint,
  GeoReferencedObject,
  ObjectDimensions,
} from '../types';
import { BoundingBox } from '@/modules/video/types';
import { CameraParams } from '@/modules/processor/types';
import { LogEntry } from '@/modules/flight/types';

@Injectable()
export class GeoreferencingProcessor {
  private readonly logger = new Logger(GeoreferencingProcessor.name);
  private readonly EARTH_RADIUS = 6371000; // meters

  /**
   * 드론 상태 보간 계산
   */
  interpolateDroneState(
    targetTimeMs: number,
    logEntries: LogEntry[],
  ): DroneState {
    // 로그 엔트리가 시간 순서대로 정렬되어 있다고 가정합니다.

    // Edge cases 처리
    if (targetTimeMs <= logEntries[0].timeMs) {
      this.logger.warn(
        `Target time ${targetTimeMs}ms is before first log entry, using first log entry state`,
      );
      return this.convertToDroneState(logEntries[0]);
    }
    if (targetTimeMs >= logEntries[logEntries.length - 1].timeMs) {
      this.logger.warn(
        `Target time ${targetTimeMs}ms is after last log entry, using last log entry state`,
      );
      return this.convertToDroneState(logEntries[logEntries.length - 1]);
    }

    // 이진 검색으로 적절한 인덱스 찾기
    let left = 0;
    let right = logEntries.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midTime = logEntries[mid].timeMs;

      if (midTime === targetTimeMs) {
        return this.convertToDroneState(logEntries[mid]);
      } else if (midTime < targetTimeMs) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    // 보간을 위한 beforeState와 afterState 선택
    const beforeIndex = Math.max(0, right);
    const afterIndex = Math.min(logEntries.length - 1, left);

    const beforeState = this.convertToDroneState(logEntries[beforeIndex]);
    const afterState = this.convertToDroneState(logEntries[afterIndex]);

    // 시간 범위 검증
    if (targetTimeMs < beforeState.timeMs || targetTimeMs > afterState.timeMs) {
      this.logger.error(`interpolateDroneState에서 시간 범위 오류`, {
        targetTimeMs,
        'beforeState.timeMs': beforeState.timeMs,
        'afterState.timeMs': afterState.timeMs,
      });
      throw new Error(
        'Target time is outside the state range after binary search',
      );
    }

    // 가중치 계산 (0-1)
    const weight =
      (targetTimeMs - beforeState.timeMs) /
      (afterState.timeMs - beforeState.timeMs);

    return {
      latitude: this.interpolateLinear(
        beforeState.latitude,
        afterState.latitude,
        weight,
      ),
      longitude: this.interpolateLinear(
        beforeState.longitude,
        afterState.longitude,
        weight,
      ),
      altitude: this.interpolateLinear(
        beforeState.altitude,
        afterState.altitude,
        weight,
      ),
      heading: this.interpolateHeading(
        beforeState.heading,
        afterState.heading,
        weight,
      ),
      timestamp: new Date(
        beforeState.timestamp.getTime() +
          (afterState.timestamp.getTime() - beforeState.timestamp.getTime()) *
            weight,
      ),
      timeMs: targetTimeMs,
    };
  }

  /**
   * 객체의 지리 좌표 계산 (탑뷰 가정)
   */
  calculateObjectGeoPosition(
    bbox: BoundingBox,
    droneState: DroneState,
    cameraParams: CameraParams,
    imageWidth: number,
    imageHeight: number,
  ): GeoReferencedObject {
    // bbox를 정규화된 값으로 변환 (0~1 사이)
    const normalizedBbox = this.normalizeBoundingBox(bbox, imageWidth, imageHeight);

    // 1. 이미지 상의 상대좌표를 실제 거리로 변환
    const {
      xOffset,
      yOffset,
      dimensions,
      pixelToWorldRatio,
    } = this.calculateOffsetsAndDimensions(
      normalizedBbox,
      droneState.altitude,
      cameraParams.horizontalFov,
      cameraParams.verticalFov,
    );

    // 2. 드론의 헤딩을 고려하여 x, y 오프셋을 회전 변환
    const { rotatedX, rotatedY } = this.rotateOffsets(
      xOffset,
      yOffset,
      droneState.heading,
    );

    // 3. 드론 위치에서 오프셋을 적용하여 객체 위치 계산
    const center = this.calculateDestinationPoint(
      droneState,
      rotatedX,
      rotatedY,
    );

    return {
      center: {
        ...center,
        altitude: 0, // 지상 고도
      },
      dimensions,
      pixelToWorldRatio,
    };
  }

  private normalizeBoundingBox(
    bbox: BoundingBox,
    imageWidth: number,
    imageHeight: number,
  ): BoundingBox {
    return {
      x: bbox.x / imageWidth,
      y: bbox.y / imageHeight,
      width: bbox.width / imageWidth,
      height: bbox.height / imageHeight,
    };
  }

  private calculateOffsetsAndDimensions(
    bbox: BoundingBox,
    altitude: number,
    horizontalFov: number,
    verticalFov: number,
  ): {
    xOffset: number; // meters
    yOffset: number; // meters
    dimensions: ObjectDimensions;
    pixelToWorldRatio: number; // meters per pixel
  } {
    // 화각의 radian 변환
    const hFovRad = (horizontalFov * Math.PI) / 180;
    const vFovRad = (verticalFov * Math.PI) / 180;

    // 이미지 상의 상대 위치 (-0.5 ~ 0.5)
    const xRelative = bbox.x - 0.5;
    const yRelative = 0.5 - bbox.y; // y축 방향 반전

    // 지상 평면에서의 최대 x, y 거리
    const maxX = altitude * Math.tan(hFovRad / 2);
    const maxY = altitude * Math.tan(vFovRad / 2);

    // 실제 x, y 오프셋 계산
    const xOffset = xRelative * 2 * maxX;
    const yOffset = yRelative * 2 * maxY;

    // 객체의 실제 크기 계산
    const dimensions = {
      width: bbox.width * 2 * maxX,
      height: bbox.height * 2 * maxY,
    };

    // 픽셀 당 실제 거리 (가로 방향 기준)
    const pixelToWorldRatio = (2 * maxX) / 1; // normalized width가 1일 때의 실제 거리

    return { xOffset, yOffset, dimensions, pixelToWorldRatio };
  }

  private rotateOffsets(
    xOffset: number,
    yOffset: number,
    heading: number,
  ): { rotatedX: number; rotatedY: number } {
    const headingRad = ((heading - 90) * Math.PI) / 180; // 북쪽이 0도 기준이 되도록 보정

    const cosH = Math.cos(headingRad);
    const sinH = Math.sin(headingRad);

    const rotatedX = xOffset * cosH - yOffset * sinH;
    const rotatedY = xOffset * sinH + yOffset * cosH;

    return { rotatedX, rotatedY };
  }

  private calculateDestinationPoint(
    start: GeoPoint,
    xOffset: number,
    yOffset: number,
  ): GeoPoint {
    // 위도 1미터당 거리 (근사치)
    const deltaLat = (yOffset / this.EARTH_RADIUS) * (180 / Math.PI);
    const deltaLon =
      (xOffset /
        (this.EARTH_RADIUS * Math.cos((start.latitude * Math.PI) / 180))) *
      (180 / Math.PI);

    return {
      latitude: start.latitude + deltaLat,
      longitude: start.longitude + deltaLon,
      altitude: start.altitude,
    };
  }

  private interpolateLinear(
    start: number,
    end: number,
    weight: number,
  ): number {
    return start + (end - start) * weight;
  }

  private interpolateHeading(
    start: number,
    end: number,
    weight: number,
  ): number {
    let diff = end - start;

    // 360도 교차점 처리
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    let result = start + diff * weight;

    // 결과값 정규화
    if (result >= 360) result -= 360;
    if (result < 0) result += 360;

    return result;
  }

  private convertToDroneState(entry: LogEntry): DroneState {
    return {
      latitude: entry.latitude,
      longitude: entry.longitude,
      altitude: entry.altitude,
      heading: entry.heading,
      timestamp: entry.timestamp,
      timeMs: entry.timeMs,
    };
  }
}
