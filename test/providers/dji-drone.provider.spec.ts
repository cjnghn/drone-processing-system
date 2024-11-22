// test/providers/dji-drone.provider.spec.ts
import { Test, TestingModule } from '@nestjs/testing';

import * as fs from 'fs/promises';
import * as path from 'path';
import { DJIDroneProvider } from '../../src/infrastructure/providers/dji/dji-drone.provider';

describe('DJIDroneProvider', () => {
  let provider: DJIDroneProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DJIDroneProvider],
    }).compile();

    provider = module.get<DJIDroneProvider>(DJIDroneProvider);
  });

  describe('parseFlightLog', () => {
    it('should parse flight log correctly', async () => {
      // Given
      const logPath = path.join(__dirname, '../fixtures/sample-flight.csv');

      // When
      const result = await provider.parseFlightLog(logPath);

      // Then
      expect(result.segments).toHaveLength(2);
      expect(result.segments[0].coordinates).toHaveLength(3);
      expect(result.segments[1].coordinates).toHaveLength(4);
      expect(result.metadata.totalDuration).toBe(12000);

      const segment = result.segments[0];
      expect(segment.coordinates).toHaveLength(3);
      expect(segment.startTime.elapsed).toBe(1000);
      expect(segment.endTime.elapsed).toBe(3000);

      // Check coordinate conversion
      const firstCoord = segment.coordinates[0];
      expect(firstCoord.latitude).toBe(37.5666);
      expect(firstCoord.longitude).toBe(126.9781);
      expect(firstCoord.altitude).toBeCloseTo(30.63); // 100.5 feet in meters
    });
  });

  describe('parseTrackingData', () => {
    it('should parse tracking data correctly', async () => {
      // Given
      const trackingPath = path.join(
        __dirname,
        '../fixtures/sample-tracking.json',
      );

      // When
      const result = await provider.parseTrackingData(trackingPath);

      // Then
      expect(result.model.name).toBe('yolov11s_v4_2560_b8_e60');
      expect(result.video.width).toBe(2688);
      expect(result.video.height).toBe(1512);
      expect(result.tracking_results).toHaveLength(2);

      // 첫 번째 프레임의 첫 번째 detection 확인
      const firstDetection = result.tracking_results[0].res[0];
      expect(firstDetection.tid).toBe(1);
      expect(firstDetection.bbox).toEqual([1200, 800, 100, 100]);
      expect(firstDetection.conf).toBeCloseTo(0.968);
    });

    it('should throw error for invalid tracking data format', async () => {
      // Given
      const invalidData = {
        model: { name: 'test' },
        // Missing required fields
      };
      jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(invalidData));

      // When/Then
      await expect(provider.parseTrackingData('invalid.json')).rejects.toThrow(
        'Invalid model information',
      );
    });
  });

  describe('mapFrameToTime', () => {
    it('should correctly map frame index to elapsed time', () => {
      // Given
      const frameIndex = 30;
      const fps = 30;
      const segmentStartTime = 1000; // ms

      // When
      const result = provider.mapFrameToTime(frameIndex, fps, segmentStartTime);

      // Then
      expect(result).toBe(2000); // 1000ms + (30 frames * (1000ms/30fps))
    });
  });
});
