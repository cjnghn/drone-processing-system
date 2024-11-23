// test/unit/georeferencing/services/georeferencing.processor.spec.ts
import { GeoreferencingProcessor } from '@/modules/georeferencing/services/georeferencing.processor';
import { DroneState } from '@/modules/georeferencing/types';
import { BoundingBox } from '@/modules/video/types';
import { Test, TestingModule } from '@nestjs/testing';

describe('GeoreferencingProcessor', () => {
  let processor: GeoreferencingProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeoreferencingProcessor],
    }).compile();

    processor = module.get<GeoreferencingProcessor>(GeoreferencingProcessor);
  });

  describe('interpolateDroneState', () => {
    it('시간에 따른 드론 상태를 정확하게 보간해야 한다', () => {
      // Given
      const beforeState: DroneState = {
        latitude: 37.5,
        longitude: 127.5,
        altitude: 100,
        heading: 90,
        timestamp: new Date('2024-01-01T12:00:00Z'),
        timeMs: 0,
      };

      const afterState: DroneState = {
        latitude: 37.6,
        longitude: 127.6,
        altitude: 120,
        heading: 100,
        timestamp: new Date('2024-01-01T12:00:02Z'),
        timeMs: 2000,
      };

      // When
      const result = processor.interpolateDroneState(
        1000,
        beforeState,
        afterState,
      );

      // Then
      expect(result).toEqual({
        latitude: 37.55,
        longitude: 127.55,
        altitude: 110,
        heading: 95,
        timestamp: new Date('2024-01-01T12:00:01Z'),
        timeMs: 1000,
      });
    });

    it('heading이 360도를 교차할 때 올바르게 보간해야 한다', () => {
      // Given
      const beforeState: DroneState = {
        latitude: 37.5,
        longitude: 127.5,
        altitude: 100,
        heading: 350,
        timestamp: new Date('2024-01-01T12:00:00Z'),
        timeMs: 0,
      };

      const afterState: DroneState = {
        latitude: 37.5,
        longitude: 127.5,
        altitude: 100,
        heading: 10,
        timestamp: new Date('2024-01-01T12:00:01Z'),
        timeMs: 1000,
      };

      // When
      const result = processor.interpolateDroneState(
        500,
        beforeState,
        afterState,
      );

      // Then
      expect(result.heading).toBe(0); // 최단 경로로 보간
    });
  });

  describe('calculateObjectGeoPosition', () => {
    it('드론 직하방의 객체 위치를 계산해야 한다', () => {
      // Given
      const droneState: DroneState = {
        latitude: 37.5,
        longitude: 127.5,
        altitude: 100, // 100m 고도
        heading: 0, // 북쪽 방향
        timestamp: new Date(),
        timeMs: 0,
      };

      const bbox: BoundingBox = {
        x: 0.5, // 이미지 중심
        y: 0.5,
        width: 0.1,
        height: 0.1,
      };

      // When
      const result = processor.calculateObjectGeoPosition(bbox, droneState, {
        horizontalFov: 90,
        verticalFov: 60,
        height: droneState.altitude,
      });

      // Then
      expect(result.center.latitude).toBeCloseTo(37.5);
      expect(result.center.longitude).toBeCloseTo(127.5);
      expect(result.center.altitude).toBeCloseTo(0);
    });

    it('이미지 오프셋에 따른 객체 위치를 계산해야 한다', () => {
      // Given
      const droneState: DroneState = {
        latitude: 37.5,
        longitude: 127.5,
        altitude: 100,
        heading: 0, // 북쪽 방향
        timestamp: new Date(),
        timeMs: 0,
      };

      // 이미지 우측의 객체
      const bbox: BoundingBox = {
        x: 0.75, // 이미지 중심에서 우측으로 1/4
        y: 0.5, // 세로 중앙
        width: 0.1,
        height: 0.1,
      };

      // When
      const result = processor.calculateObjectGeoPosition(bbox, droneState, {
        horizontalFov: 90, // 90도 화각
        verticalFov: 60,
        height: droneState.altitude,
      });

      // Then
      // 드론이 북쪽을 향하고 있을 때, 이미지 우측의 객체는 동쪽에 있어야 함
      expect(result.center.longitude).toBeGreaterThan(droneState.longitude);
      // 고도는 지상
      expect(result.center.altitude).toBe(0);
    });

    it('드론 heading에 따른 객체 위치를 계산해야 한다', () => {
      // Given
      const droneState: DroneState = {
        latitude: 37.5,
        longitude: 127.5,
        altitude: 100,
        heading: 90, // 동쪽 방향
        timestamp: new Date(),
        timeMs: 0,
      };

      // 이미지 우측의 객체
      const bbox: BoundingBox = {
        x: 0.75,
        y: 0.5,
        width: 0.1,
        height: 0.1,
      };

      // When
      const result = processor.calculateObjectGeoPosition(bbox, droneState, {
        horizontalFov: 90,
        verticalFov: 60,
        height: droneState.altitude,
      });

      // Then
      // 드론이 동쪽을 향할 때, 이미지 우측의 객체는 남쪽에 있어야 함
      expect(result.center.latitude).toBeLessThan(droneState.latitude);
    });
  });
});
