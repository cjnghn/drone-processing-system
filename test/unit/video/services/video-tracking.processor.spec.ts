// test/unit/video/services/video-tracking.processor.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { VideoTrackingProcessor } from '@/modules/video/services/video-tracking.processor';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

describe('VideoTrackingProcessor', () => {
  let processor: VideoTrackingProcessor;
  let fixturesDir: string;

  beforeAll(() => {
    // Given: 테스트 디렉토리 설정
    fixturesDir = join(__dirname, '../../../fixtures/tracking');
    mkdirSync(fixturesDir, { recursive: true });
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VideoTrackingProcessor],
    }).compile();

    processor = module.get<VideoTrackingProcessor>(VideoTrackingProcessor);
  });

  describe('processTrackingFile', () => {
    describe('기본 파싱', () => {
      let validTrackingPath: string;

      beforeEach(() => {
        // Given: 유효한 트래킹 데이터 파일 준비
        validTrackingPath = join(fixturesDir, 'valid-tracking.json');
        const validData = {
          video: {
            name: 'DJI_0001',
            width: 2688,
            height: 1512,
            fps: 29.97,
            total_frames: 60,
          },
          tracking_results: [
            {
              i: 0,
              res: [
                {
                  tid: 1,
                  cid: 1,
                  conf: 0.95,
                  bbox: [1344, 756, 1478, 890], // 중앙 부근 객체
                },
              ],
            },
          ],
        };
        if (!existsSync(validTrackingPath))
          writeFileSync(validTrackingPath, JSON.stringify(validData));
      });

      it('유효한 트래킹 파일을 성공적으로 처리해야 한다', async () => {
        // When
        const result = await processor.processTrackingFile(validTrackingPath);

        // Then
        expect(result.metadata).toBeDefined();
        expect(result.frames).toBeDefined();
        expect(result.frames).toHaveLength(1);
      });

      it('비디오 메타데이터를 올바르게 추출해야 한다', async () => {
        // When
        const result = await processor.processTrackingFile(validTrackingPath);

        // Then
        expect(result.metadata).toEqual({
          name: 'DJI_0001',
          width: 2688,
          height: 1512,
          fps: 29.97,
          totalFrames: 60,
          durationMs: 2002, // Math.floor((60 / 29.97) * 1000)
        });
      });
    });

    describe('좌표 처리', () => {
      let testPath: string;

      beforeEach(() => {
        // Given: 테스트를 위한 데이터 준비
        testPath = join(fixturesDir, 'tracking-test.json');
        const testData = {
          video: {
            name: 'DJI_0001',
            width: 1000, // 간단한 계산을 위한 크기
            height: 1000,
            fps: 30,
            total_frames: 60,
          },
          tracking_results: [
            {
              i: 0,
              res: [
                {
                  tid: 1,
                  cid: 1,
                  conf: 0.95,
                  bbox: [100, 100, 200, 200], // 픽셀 좌표
                },
              ],
            },
          ],
        };
        writeFileSync(testPath, JSON.stringify(testData));
      });

      it('bbox 좌표를 픽셀 단위로 처리해야 한다', async () => {
        // When
        const result = await processor.processTrackingFile(testPath);

        // Then
        const bbox = result.frames[0].objects[0].bbox;
        expect(bbox).toEqual({
          x: 150, // 중심점 X: (100 + 200) / 2
          y: 150, // 중심점 Y: (100 + 200) / 2
          width: 100, // 너비: (200 - 100)
          height: 100, // 높이: (200 - 100)
        });
      });
    });

    describe('객체 추적 연속성', () => {
      let continuityTestPath: string;

      beforeEach(() => {
        // Given: 연속적인 추적 데이터 준비
        continuityTestPath = join(fixturesDir, 'continuity-test.json');
        const testData = {
          video: {
            name: 'DJI_0001',
            width: 1000,
            height: 1000,
            fps: 30,
            total_frames: 60,
          },
          tracking_results: [
            {
              i: 0,
              res: [{ tid: 1, cid: 1, conf: 0.95, bbox: [100, 100, 200, 200] }],
            },
            {
              i: 1,
              res: [{ tid: 1, cid: 1, conf: 0.94, bbox: [110, 110, 210, 210] }],
            },
            {
              i: 2,
              res: [{ tid: 1, cid: 1, conf: 0.93, bbox: [120, 120, 220, 220] }],
            },
          ],
        };
        if (!existsSync(continuityTestPath))
          writeFileSync(continuityTestPath, JSON.stringify(testData));
      });

      it('동일한 객체의 연속적인 추적을 유지해야 한다', async () => {
        // When
        const result = await processor.processTrackingFile(continuityTestPath);

        // Then
        expect(result.frames).toHaveLength(3);

        // trackId 일관성 확인
        const trackIds = result.frames.map((frame) => frame.objects[0].trackId);
        expect(new Set(trackIds).size).toBe(1);
      });
    });

    describe('에러 처리', () => {
      it('존재하지 않는 파일에 대해 적절한 에러를 발생시켜야 한다', async () => {
        // Given
        const nonExistentPath = join(fixturesDir, 'non-existent.json');

        // When & Then
        await expect(
          processor.processTrackingFile(nonExistentPath),
        ).rejects.toThrow('ENOENT');
      });

      it('잘못된 JSON 형식에 대해 적절한 에러를 발생시켜야 한다', async () => {
        // Given
        const invalidJsonPath = join(fixturesDir, 'invalid-json.json');
        if (!existsSync(invalidJsonPath))
          writeFileSync(invalidJsonPath, '{ invalid json }');

        // When & Then
        await expect(
          processor.processTrackingFile(invalidJsonPath),
        ).rejects.toThrow('Tracking data processing failed');
      });

      it('필수 메타데이터가 없는 경우 에러를 발생시켜야 한다', async () => {
        // Given
        const invalidMetadataPath = join(fixturesDir, 'invalid-metadata.json');
        const invalidData = {
          video: {
            name: 'DJI_0001',
            // 필수 필드 누락
          },
          tracking_results: [],
        };
        if (!existsSync(invalidMetadataPath))
          writeFileSync(invalidMetadataPath, JSON.stringify(invalidData));

        // When & Then
        await expect(
          processor.processTrackingFile(invalidMetadataPath),
        ).rejects.toThrow('Invalid video metadata format');
      });
    });

    describe('성능 검증', () => {
      let largeDataPath: string;

      beforeEach(() => {
        // Given: 대량의 트래킹 데이터 생성
        largeDataPath = join(fixturesDir, 'large-tracking.json');
        const largeData = {
          video: {
            name: 'DJI_0001',
            width: 2688,
            height: 1512,
            fps: 29.97,
            total_frames: 1000,
          },
          tracking_results: Array.from({ length: 1000 }, (_, i) => ({
            i,
            res: Array.from({ length: 5 }, (_, j) => ({
              tid: j,
              cid: 1,
              conf: 0.95,
              bbox: [100, 100, 200, 200],
            })),
          })),
        };
        writeFileSync(largeDataPath, JSON.stringify(largeData));
      });

      it('대량의 프레임과 객체를 효율적으로 처리해야 한다', async () => {
        // When
        const startTime = Date.now();
        const result = await processor.processTrackingFile(largeDataPath);
        const duration = Date.now() - startTime;

        // Then
        expect(result.frames).toHaveLength(1000);
        expect(result.frames[0].objects).toHaveLength(5);
        expect(duration).toBeLessThan(1000); // 1초 이내 처리
      });
    });
  });
});
