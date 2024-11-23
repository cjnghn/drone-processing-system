// src/cli/commands/process-flight.command.ts

/** Usage:
node dist/cli process-flight \
  --name "비행 1" \
  --date "2021-01-01" \
  --description "첫 번째 비행" \
  --log "../2024-11-19/Nov-19th-2024-02-27PM-Flight-Airdata.csv" \
  --videos "../2024-11-19/DJI_0279.MP4,../2024-11-19/DJI_0280.MP4" \
  --trackings "../2024-11-19/bytetrack_yolov11s_v4_2560_b8_e60_DJI_0279.json,../2024-11-19/bytetrack_yolov11s_v4_2560_b8_e60_DJI_0280.json"
 */
import { Command, CommandRunner, Option } from 'nest-commander';
import { ProcessorService } from '@/modules/processor/services/processor.service';
import { Logger } from '@nestjs/common';
import { existsSync } from 'fs';
import { resolve } from 'path';

interface ProcessFlightOptions {
  name: string;
  date: string;
  description?: string;
  log: string;
  videos: string[];
  trackings: string[];
}

@Command({
  name: 'process-flight',
  description: '드론 비행 데이터를 처리합니다.',
})
export class ProcessFlightCommand extends CommandRunner {
  private readonly logger = new Logger(ProcessFlightCommand.name);

  constructor(private readonly processorService: ProcessorService) {
    super();
  }

  @Option({
    flags: '--name [number]',
    description: '비행 이름',
    required: true,
  })
  parseName(val: string): string {
    return val;
  }

  @Option({
    flags: '--date [date]',
    description: '비행 날짜 (YYYY-MM-DD)',
    required: true,
  })
  parseData(val: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      throw new Error('날짜 형식은 YYYY-MM-DD여야 합니다');
    }
    return val;
  }

  @Option({
    flags: '--description [description]',
    description: '비행 설명',
  })
  parseDescription(val: string): string {
    return val;
  }

  @Option({
    flags: '--log [path]',
    description: '비행 로그 파일 경로 (CSV)',
    required: true,
  })
  parseLogPath(val: string): string {
    const path = resolve(val);
    if (!existsSync(path)) {
      throw new Error(`로그 파일을 찾을 수 없습니다: ${path}`);
    }
    return path;
  }

  @Option({
    flags: '--videos [paths]',
    description: '비디오 파일 경로들 (쉼표로 구분)',
    required: true,
  })
  parseVideos(val: string): string[] {
    const paths = val.split(',').map((p) => resolve(p.trim()));
    paths.forEach((path) => {
      if (!existsSync(path)) {
        throw new Error(`비디오 파일을 찾을 수 없습니다: ${path}`);
      }
    });
    return paths;
  }

  @Option({
    flags: '--trackings [paths]',
    description: '트래킹 JSON 파일 경로들 (쉼표로 구분)',
    required: true,
  })
  parseTrackings(val: string): string[] {
    const paths = val.split(',').map((p) => resolve(p.trim()));
    paths.forEach((path) => {
      if (!existsSync(path)) {
        throw new Error(`트래킹 파일을 찾을 수 없습니다: ${path}`);
      }
    });
    return paths;
  }

  async run(
    passedParams: string[],
    options: ProcessFlightOptions,
  ): Promise<void> {
    try {
      this.logger.log('비행 데이터 처리 시작...');
      this.logger.debug('입력 옵션:', options);

      const result = await this.processorService.processFlightData(
        {
          name: options.name,
          date: new Date(options.date),
          description: options.description,
        },
        options.log,
        options.videos,
        options.trackings,
        {
          // 대각선 시야각 83
          horizontalFov: 73.7,
          verticalFov: 53.1,
        },
      );

      console.log('비행 데이터 처리 완료:', result.segments[0]);
    } catch (error) {
      this.logger.error('비행 데이터 처리 중 오류 발생:', error);
      process.exit(1);
    }
  }
}
