// test/unit/flight/services/flight-log.processor.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { FlightLogProcessor } from '@/modules/flight/services/flight-log.processor';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

describe('FlightLogProcessor', () => {
  let processor: FlightLogProcessor;
  let testFilePath: string;

  beforeAll(() => {
    // Given: 테스트 CSV 파일 준비
    const fixturesDir = join(__dirname, '../../../fixtures/flight');
    // mkdirSync(fixturesDir, { recursive: true });
    testFilePath = join(fixturesDir, 'test-flight-log.csv');

    // const csvContent =
    //   'time(millisecond),datetime(utc),latitude,longitude,ascent(feet),compass_heading(degrees),isVideo\n' +
    //   '1000,2024-01-01T12:00:00Z,37.5,127.5,100,90,0\n' +
    //   '2000,2024-01-01T12:00:01Z,37.6,127.6,110,92,1\n' + // 비디오 세그먼트 1 시작
    //   '3000,2024-01-01T12:00:02Z,37.7,127.7,120,94,1\n' +
    //   '4000,2024-01-01T12:00:03Z,37.8,127.8,130,96,0\n' + // 비디오 세그먼트 1 종료
    //   '5000,2024-01-01T12:00:04Z,37.9,127.9,140,98,1\n' + // 비디오 세그먼트 2 시작
    //   '6000,2024-01-01T12:00:05Z,38.0,128.0,150,100,1\n'; // 비디오 세그먼트 2 계속

    // if (!existsSync(testFilePath)) writeFileSync(testFilePath, csvContent);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FlightLogProcessor],
    }).compile();

    processor = module.get<FlightLogProcessor>(FlightLogProcessor);
  });

  describe('processLogFile', () => {
    describe('로그 엔트리 처리', () => {
      it('비행 로그 데이터를 올바르게 파싱해야 한다', async () => {
        // When: 로그 파일 처리
        const result = await processor.processLogFile(testFilePath);

        // Then: 결과 검증
        expect(result.logEntries).toHaveLength(6);

        const firstEntry = result.logEntries[0];
        expect(firstEntry).toEqual({
          timeMs: 0,
          timestamp: new Date('2024-01-01T12:00:00Z'),
          latitude: 37.5,
          longitude: 127.5,
          altitude: 30.48, // 100 feet converted to meters
          heading: 90,
          isVideo: false,
        });
      });
    });

    describe('비디오 세그먼트 추출', () => {
      it('연속된 비디오 구간을 올바르게 식별해야 한다', async () => {
        // When: 로그 파일 처리
        const result = await processor.processLogFile(testFilePath);

        // Then: 비디오 세그먼트 검증
        expect(result.videoSegments).toHaveLength(2);

        // 첫 번째 세그먼트 검증
        const firstSegment = result.videoSegments[0];
        expect(firstSegment).toEqual({
          startLogIndex: 1,
          endLogIndex: 2,
          startTimeMs: 1000,
          endTimeMs: 2000,
          duration: 1000,
          logEntries: expect.arrayContaining([
            expect.objectContaining({ isVideo: true }),
          ]),
        });

        // 두 번째 세그먼트 검증
        const secondSegment = result.videoSegments[1];
        expect(secondSegment).toEqual({
          startLogIndex: 4,
          endLogIndex: 5,
          startTimeMs: 4000,
          endTimeMs: 5000,
          duration: 1000,
          logEntries: expect.arrayContaining([
            expect.objectContaining({ isVideo: true }),
          ]),
        });
      });
    });

    // describe('에러 처리', () => {
    //   it('존재하지 않는 파일에 대해 적절한 에러를 발생시켜야 한다', async () => {
    //     // Given: 존재하지 않는 파일 경로
    //     const invalidPath = 'non-existent.csv';

    //     // When & Then: 에러 발생 검증
    //     await expect(processor.processLogFile(invalidPath)).rejects.toThrow(
    //       'Flight log processing failed',
    //     );
    //   });
    // });
  });
});
