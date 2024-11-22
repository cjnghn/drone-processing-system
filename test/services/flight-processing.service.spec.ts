import { Test, TestingModule } from '@nestjs/testing';
import {
  DRONE_PROVIDER,
  DroneProvider,
} from '@/domain/interfaces/drone-provider.interface';
import { FlightProcessingService } from '@/application/services/flight-processing.service';
import { FlightSegment } from '@/domain/interfaces/flight-log.interface';
import { TrackingData } from '@/domain/interfaces/tracking-data.interface';

describe('FlightProcessingService', () => {
  let service: FlightProcessingService;
  let mockDroneProvider: jest.Mocked<DroneProvider>;

  // 테스트용 비행 세그먼트 데이터
  const mockFlightSegment: FlightSegment = {
    startTime: {
      elapsed: 1000,
      utc: new Date('2024-01-01T10:00:01'),
    },
    endTime: {
      elapsed: 4000,
      utc: new Date('2024-01-01T10:00:04'),
    },
    coordinates: [
      {
        elapsed: 1000,
        utc: new Date('2024-01-01T10:00:01'),
        latitude: 37.5666,
        longitude: 126.9781,
        altitude: 100,
        heading: 180,
      },
      {
        elapsed: 2000,
        utc: new Date('2024-01-01T10:00:02'),
        latitude: 37.5667,
        longitude: 126.9782,
        altitude: 101,
        heading: 185,
      },
      {
        elapsed: 3000,
        utc: new Date('2024-01-01T10:00:03'),
        latitude: 37.5668,
        longitude: 126.9783,
        altitude: 102,
        heading: 190,
      },
    ],
  };

  // 테스트용 트래킹 데이터
  const mockTrackingData: TrackingData = {
    model: {
      name: 'yolov11s_v4_2560_b8_e60',
      confidence_threshold: 0.3,
      nms: true,
    },
    tracker: {
      name: 'bytetrack',
    },
    video: {
      name: 'test_video',
      width: 2688,
      height: 1512,
      fps: 30,
      total_frames: 90,
    },
    tracking_results: [
      {
        i: 0, // 첫 프레임
        res: [
          {
            tid: 1,
            bbox: [1200, 800, 100, 100], // [x, y, width, height]
            conf: 0.95,
            cid: 1,
          },
        ],
      },
      {
        i: 30, // 1초 후 프레임
        res: [
          {
            tid: 1,
            bbox: [1220, 810, 100, 100],
            conf: 0.94,
            cid: 1,
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    mockDroneProvider = {
      parseFlightLog: jest.fn(),
      parseTrackingData: jest.fn().mockResolvedValue(mockTrackingData),
      mapFrameToTime: jest
        .fn()
        .mockImplementation((frameIndex, fps, startTime) => {
          return startTime + (frameIndex * 1000) / fps;
        }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlightProcessingService,
        {
          provide: DRONE_PROVIDER,
          useValue: mockDroneProvider,
        },
      ],
    }).compile();

    service = module.get<FlightProcessingService>(FlightProcessingService);
  });

  describe('processVideoSegment', () => {
    it('should process video segment and return processed frames', async () => {
      // When
      const result = await service.processVideoSegment(
        mockFlightSegment,
        'mock-tracking.json',
      );

      // Then
      expect(result).toHaveLength(2); // 두 개의 프레임이 있어야 함

      // 첫 번째 프레임 검증
      const firstFrame = result[0];
      expect(firstFrame.frameIndex).toBe(0);
      expect(firstFrame.elapsedTime).toBe(1000); // 세그먼트 시작 시간
      expect(firstFrame.detections).toHaveLength(1);

      // 정규화된 좌표 검증
      const firstDetection = firstFrame.detections[0];
      expect(firstDetection.normalizedPosition.x).toBeCloseTo(0.465, 3); // (1200 + 50) / 2688
      expect(firstDetection.normalizedPosition.y).toBeCloseTo(0.562, 3); // (800 + 50) / 1512
    });

    it('should correctly interpolate drone position', async () => {
      // When
      const result = await service.processVideoSegment(
        mockFlightSegment,
        'mock-tracking.json',
      );

      // Then
      const secondFrame = result[1]; // 30프레임 = 1초 후
      expect(secondFrame.frameIndex).toBe(30);

      // 1초 후의 위치는 첫 번째와 두 번째 좌표 사이에 있어야 함
      expect(secondFrame.dronePosition.latitude).toBeCloseTo(37.5667, 6);
      expect(secondFrame.dronePosition.longitude).toBeCloseTo(126.9782, 6);
      expect(secondFrame.dronePosition.altitude).toBeCloseTo(101, 1);
    });

    it('should handle heading interpolation correctly', async () => {
      // When
      const result = await service.processVideoSegment(
        mockFlightSegment,
        'mock-tracking.json',
      );

      // 헤딩 보간 검증 (180도에서 185도로 변화)
      const interpolatedHeading = result[1].dronePosition.heading;
      expect(interpolatedHeading).toBeCloseTo(185, 1);
    });

    it('should handle heading interpolation across 360 degree boundary', async () => {
      // Given
      const segmentWithHeadingCrossing: FlightSegment = {
        ...mockFlightSegment,
        coordinates: [
          {
            ...mockFlightSegment.coordinates[0],
            elapsed: 1000,
            heading: 350,
          },
          {
            ...mockFlightSegment.coordinates[1],
            elapsed: 2000,
            heading: 10,
          },
        ],
      };

      // 30fps에서 프레임 30은 정확히 1초 후
      mockTrackingData.tracking_results = [
        {
          i: 30,
          res: [{ tid: 1, bbox: [1200, 800, 100, 100], conf: 0.95, cid: 1 }],
        },
      ];

      // When
      const result = await service.processVideoSegment(
        segmentWithHeadingCrossing,
        'mock-tracking.json',
      );

      // Then
      const interpolatedHeading = result[0].dronePosition.heading;
      // 350에서 10으로 가는 최단 경로는 360/0을 지나는 것
      expect(interpolatedHeading).toBeCloseTo(0, 1);
    });

    it('should handle tracking data parsing error', async () => {
      // Given
      mockDroneProvider.parseTrackingData.mockRejectedValue(
        new Error('Failed to parse tracking data'),
      );

      // When/Then
      await expect(
        service.processVideoSegment(mockFlightSegment, 'invalid.json'),
      ).rejects.toThrow('Failed to parse tracking data');
    });

    it('should skip frames outside segment time range', async () => {
      // Given
      const shortSegment: FlightSegment = {
        ...mockFlightSegment,
        startTime: { elapsed: 1000, utc: new Date('2024-01-01T10:00:01') },
        endTime: { elapsed: 2000, utc: new Date('2024-01-01T10:00:02') },
      };

      const outOfRangeTrackingData: TrackingData = {
        ...mockTrackingData,
        tracking_results: [
          {
            i: 60, // 2초 = 세그먼트 범위 밖
            res: [
              {
                tid: 1,
                bbox: [1200, 800, 100, 100],
                conf: 0.95,
                cid: 1,
              },
            ],
          },
        ],
      };
      mockDroneProvider.parseTrackingData.mockResolvedValue(
        outOfRangeTrackingData,
      );

      // When
      const result = await service.processVideoSegment(
        shortSegment,
        'mock-tracking.json',
      );

      // Then
      expect(result).toHaveLength(0); // 범위를 벗어난 프레임은 처리되지 않아야 함
    });
  });
});
