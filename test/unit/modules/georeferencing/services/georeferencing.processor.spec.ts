// test/unit/modules/georeferencing/services/georeferencing.processor.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { GeoreferencingProcessor } from '@/modules/georeferencing/services/georeferencing.processor';
import { LogEntry } from '@/modules/flight/types';

describe('GeoreferencingProcessor', () => {
  let service: GeoreferencingProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeoreferencingProcessor],
    }).compile();

    service = module.get<GeoreferencingProcessor>(GeoreferencingProcessor);
  });

  describe('interpolatePosition', () => {
    it('should correctly interpolate position between two log entries', () => {
      const logEntries: LogEntry[] = [
        {
          timeMs: 1000,
          timestamp: new Date('2024-01-01T12:00:01Z'),
          latitude: 37.5,
          longitude: 127.5,
          altitude: 100,
          compassHeading: 90,
          isVideo: true,
        },
        {
          timeMs: 2000,
          timestamp: new Date('2024-01-01T12:00:02Z'),
          latitude: 37.6,
          longitude: 127.6,
          altitude: 200,
          compassHeading: 180,
          isVideo: true,
        },
      ];

      // 중간 지점 (1500ms) 보간 테스트
      // 500은 세그먼트 시작 시간으로부터의 시간
      const result = service.interpolatePosition(500, logEntries, 1000);

      expect(result.latitude).toBe(37.55); // 중간값
      expect(result.longitude).toBe(127.55); // 중간값
      expect(result.altitude).toBe(150); // 중간값
      expect(result.heading).toBe(135); // 중간값
      expect(result.interpolationWeight).toBe(0.5); // 중간 지점
    });

    it('should handle heading interpolation across 360 degree boundary', () => {
      const logEntries: LogEntry[] = [
        {
          timeMs: 1000,
          timestamp: new Date('2024-01-01T12:00:01Z'),
          latitude: 37.5,
          longitude: 127.5,
          altitude: 100,
          compassHeading: 350,
          isVideo: true,
        },
        {
          timeMs: 2000,
          timestamp: new Date('2024-01-01T12:00:02Z'),
          latitude: 37.6,
          longitude: 127.6,
          altitude: 200,
          compassHeading: 10,
          isVideo: true,
        },
      ];

      const result = service.interpolatePosition(500, logEntries, 1000);

      // 350도에서 10도로 변할 때는 360도를 넘지 않고 가까운 쪽으로 보간
      expect(result.heading).toBe(0);
    });

    it('should return exact values when time matches log entry', () => {
      const logEntries: LogEntry[] = [
        {
          timeMs: 1000,
          timestamp: new Date('2024-01-01T12:00:01Z'),
          latitude: 37.5,
          longitude: 127.5,
          altitude: 100,
          compassHeading: 90,
          isVideo: true,
        },
        {
          timeMs: 2000,
          timestamp: new Date('2024-01-01T12:00:02Z'),
          latitude: 37.6,
          longitude: 127.6,
          altitude: 200,
          compassHeading: 180,
          isVideo: true,
        },
      ];

      const result = service.interpolatePosition(0, logEntries, 1000);

      expect(result.latitude).toBe(37.5);
      expect(result.longitude).toBe(127.5);
      expect(result.altitude).toBe(100);
      expect(result.heading).toBe(90);
      expect(result.interpolationWeight).toBe(1);
    });
  });
});
