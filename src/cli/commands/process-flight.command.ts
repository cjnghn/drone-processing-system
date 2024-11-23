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

// src/cli/commands/process-flight.command.ts
import { Command, CommandRunner, Option } from 'nest-commander';
import { ProcessorService } from '@/modules/processor/services/processor.service';
import { Logger } from '@nestjs/common';
import { existsSync, fstat, writeFileSync } from 'fs';
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
  description: '드론 비행 데이터를 처리하고 저장합니다',
})
export class ProcessFlightCommand extends CommandRunner {
  private readonly logger = new Logger(ProcessFlightCommand.name);

  constructor(private readonly processorService: ProcessorService) {
    super();
  }

  @Option({
    flags: '--name [name]',
    description: '비행 이름',
    required: true,
  })
  parseName(val: string): string {
    return val;
  }

  @Option({
    flags: '--date <date>',
    description: '비행 날짜 (YYYY-MM-DD)',
    required: true,
  })
  parseDate(val: string): string {
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
    return this.validatePaths(val, '비디오');
  }

  @Option({
    flags: '--trackings [paths]',
    description: '트래킹 JSON 파일 경로들 (쉼표로 구분)',
    required: true,
  })
  parseTrackings(val: string): string[] {
    return this.validatePaths(val, '트래킹');
  }

  private validatePaths(val: string, type: string): string[] {
    const paths = val.split(',').map((p) => resolve(p.trim()));
    paths.forEach((path) => {
      if (!existsSync(path)) {
        throw new Error(`${type} 파일을 찾을 수 없습니다: ${path}`);
      }
    });
    return paths;
  }

  async run(
    passedParams: string[],
    options: ProcessFlightOptions,
  ): Promise<void> {
    try {
      this.logger.log(`비행 데이터 처리 시작: ${options.name}`);

      const processingResult = await this.processorService.processFlightData(
        {
          name: options.name,
          date: new Date(options.date),
          description: options.description,
        },
        options.log,
        // options.videos, TOOO
        options.trackings,
        {
          horizontalFov: 84,
          verticalFov: 62,
        },
      );

      this.logger.log('비행 데이터 처리 완료');
      writeFileSync(
        'result.json',
        JSON.stringify(processingResult, null, 2),
      );
    } catch (error) {
      this.logger.error('처리 실패:', error.message);
      process.exit(1);
    }
  }
}
