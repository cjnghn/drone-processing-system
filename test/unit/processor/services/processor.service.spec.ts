// test/unit/processor/services/processor.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ProcessorService } from '@/modules/processor/services/processor.service';
import { FlightLogProcessor } from '@/modules/flight/services/flight-log.processor';
import { VideoTrackingProcessor } from '@/modules/video/services/video-tracking.processor';
import { GeoreferencingProcessor } from '@/modules/georeferencing/services/georeferencing.processor';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

describe('ProcessorService', () => {
  let service: ProcessorService;
  let flightLogProcessor: FlightLogProcessor;
  let videoTrackingProcessor: VideoTrackingProcessor;
  let georeferencingProcessor: GeoreferencingProcessor;
  let fixturesDir: string;

  beforeAll(() => {
    // Given: 테스트 데이터 준비
    fixturesDir = join(__dirname, '../../../fixtures/processor');
    mkdirSync(fixturesDir, { recursive: true });

    // 비행 로그 파일 생성
    const logPath = join(fixturesDir, 'test-flight.csv');
    const logContent =
      'time(millisecond),datetime(utc),latitude,longitude,ascent(feet),compass_heading(degrees),isVideo\n' +
      '1000,2024-01-01T12:00:00Z,37.5,127.5,100,90,0\n' +
      '2000,2024-01-01T12:00:01Z,37.6,127.6,110,92,1\n' + // 비디오 시작
      '3000,2024-01-01T12:00:02Z,37.7,127.7,120,94,1\n' +
      '4000,2024-01-01T12:00:03Z,37.8,127.8,130,96,0\n'; // 비디오 종료

    if (!existsSync(logPath)) writeFileSync(logPath, logContent);

    // 트래킹 데이터 파일 생성
    const trackingPath = join(fixturesDir, 'tracking_1.json');
    const trackingData = {
      video: {
        name: 'DJI_0001',
        width: 2688,
        height: 1512,
        fps: 30,
        total_frames: 60,
      },
      tracking_results: [
        {
          i: 0, // 첫 프레임
          res: [
            {
              tid: 1,
              cid: 1,
              conf: 0.95,
              bbox: [1344, 756, 1478, 890], // 이미지 중앙 부근에 객체 (x1, y1, x2, y2)
            },
          ],
        },
        {
          i: 30, // 1초 후 프레임
          res: [
            {
              tid: 1,
              cid: 1,
              conf: 0.93,
              bbox: [1613, 756, 1747, 890], // 우측으로 이동 (x1, y1, x2, y2)
            },
          ],
        },
      ],
    };
    if (!existsSync(trackingPath))
      writeFileSync(trackingPath, JSON.stringify(trackingData, null, 2));
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessorService,
        FlightLogProcessor,
        VideoTrackingProcessor,
        GeoreferencingProcessor,
      ],
    }).compile();

    service = module.get<ProcessorService>(ProcessorService);
    flightLogProcessor = module.get<FlightLogProcessor>(FlightLogProcessor);
    videoTrackingProcessor = module.get<VideoTrackingProcessor>(
      VideoTrackingProcessor,
    );
    georeferencingProcessor = module.get<GeoreferencingProcessor>(
      GeoreferencingProcessor,
    );
  });

  describe('processFlightData', () => {
    it('비행 로그와 트래킹 데이터를 성공적으로 처리해야 한다', async () => {
      // Given
      const logPath = join(fixturesDir, 'test-flight.csv');
      const trackingPath = join(fixturesDir, 'tracking_1.json');

      const metadata = {
        name: 'Test Flight',
        date: new Date('2024-01-01'),
        description: 'Test flight',
      };

      const cameraParams = {
        horizontalFov: 84,
        verticalFov: 53,
      };

      // When
      const result = await service.processFlightData(
        metadata,
        logPath,
        [trackingPath],
        cameraParams,
      );

      // Then
      expect(result.metadata).toEqual(metadata);
      expect(result.segments).toHaveLength(1); // 하나의 비디오 세그먼트

      const segment = result.segments[0];
      expect(segment.video.fps).toBe(30);
      expect(segment.frames).toHaveLength(2); // 두 개의 프레임

      // 첫 번째 프레임의 객체 검증
      const firstFrame = segment.frames[0];
      expect(firstFrame.objects).toHaveLength(1);
      expect(firstFrame.objects[0].trackId).toBe(1);
      expect(firstFrame.objects[0].position.center.altitude).toBe(0); // 지상 고도

      // 두 번째 프레임과 객체 이동 검증
      const secondFrame = segment.frames[1];
      expect(secondFrame.objects).toHaveLength(1);
      expect(secondFrame.objects[0].trackId).toBe(1); // 같은 객체

      // 객체가 우측으로 이동했으므로, 드론 heading(90도)을 고려하면
      // 실제로는 남쪽 방향으로 이동해야 함
      const firstPos = firstFrame.objects[0].position.center;
      const secondPos = secondFrame.objects[0].position.center;
      expect(secondPos.latitude).toBeLessThan(firstPos.latitude);
    });
  });
});
