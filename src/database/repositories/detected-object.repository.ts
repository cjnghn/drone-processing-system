// src/database/repositories/detected-object.repository.ts

import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DetectedObject } from '../entities';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class DetectedObjectRepository extends Repository<DetectedObject> {
  constructor(
    @InjectRepository(DetectedObject)
    repository: Repository<DetectedObject>,
  ) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  // 시공간 기반 범위 객체 검색
  async findInSpaceTimeRange(params: {
    startTime: Date;
    endTime: Date;
    bounds: {
      minLat: number;
      maxLat: number;
      minLng: number;
      maxLng: number;
    };
    classIds?: number[];
    minConfidence?: number;
  }): Promise<DetectedObject[]> {
    let query = this.createQueryBuilder('obj')
      .innerJoinAndSelect('obj.video', 'video')
      .innerJoinAndSelect('video.flight', 'flight')
      .where('obj.timestamp BETWEEN :startTime AND :endTime', {
        startTime: params.startTime.getTime(),
        endTime: params.endTime.getTime(),
      })
      .andWhere('obj.latitude BETWEEN :minLat AND :maxLat', {
        minLat: params.bounds.minLat,
        maxLat: params.bounds.maxLat,
      })
      .andWhere('obj.longitude BETWEEN :minLng AND :maxLng', {
        minLng: params.bounds.minLng,
        maxLng: params.bounds.maxLng,
      });

    if (params.classIds) {
      query = query.andWhere('obj.classId IN (:...classIds)', {
        classIds: params.classIds,
      });
    }

    if (params.minConfidence) {
      query = query.andWhere('obj.confidence >= :minConfidence', {
        minConfidence: params.minConfidence,
      });
    }

    return query.getMany();
  }

  // 특정 객체의 궤적 추출
  async getObjectTrajectory(params: {
    videoId: number;
    trackId: number;
    startFrameIndex: number;
    endFrameIndex: number;
  }): Promise<DetectedObject[]> {
    let query = this.createQueryBuilder('obj')
      .where('obj.videoId = :videoId', { videoId: params.videoId })
      .andWhere('obj.trackId = :trackId', { trackId: params.trackId })
      .orderBy('obj.frameIndex', 'ASC');

    if (params.startFrameIndex !== undefined) {
      query = query.andWhere('obj.frameIndex >= :startFrameIndex', {
        startFrameIndex: params.startFrameIndex,
      });
    }

    if (params.endFrameIndex !== undefined) {
      query = query.andWhere('obj.frameIndex <= :endFrameIndex', {
        endFrameIndex: params.endFrameIndex,
      });
    }

    return query.getMany();
  }
}
