// src/database/entities/flight.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Video } from './video.entity';
import { Tracking } from './tracking.entity';

@Entity('flights')
@Index(['flightDate']) // 날짜 기반 조회를 위한 인덱스
export class Flight {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'date' })
  flightDate: Date;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'float' })
  cameraFov: number;

  @Column()
  logFilePath: string;

  @OneToMany(() => Video, (video) => video.flight, {
    cascade: true, // 비행 데이터 저장 시 연관된 비디오도 자동 저장
  })
  videos: Video[];

  @OneToMany(() => Tracking, (tracking) => tracking.flight, {
    cascade: true,
  })
  trackings: Tracking[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
