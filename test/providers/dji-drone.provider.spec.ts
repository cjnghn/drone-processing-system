// test/providers/dji-drone.provider.spec.ts
import { Test, TestingModule } from '@nestjs/testing';

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
});
