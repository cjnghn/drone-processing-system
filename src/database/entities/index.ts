// src/database/entities/index.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity()
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
  cameraHorizontalFov: number;

  @Column({ type: 'float' })
  cameraVerticalFov: number;

  @OneToMany(() => Video, (video) => video.flight)
  videos: Video[];

  @CreateDateColumn()
  createdAt: Date;
}

@Entity()
export class Video {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Flight, (flight) => flight.videos)
  flight: Flight;

  @Column()
  fileName: string;

  @Column({ type: 'int' })
  width: number;

  @Column({ type: 'int' })
  height: number;

  @Column({ type: 'float' })
  fps: number;

  @Column({ type: 'int' })
  totalFrames: number;

  @Column({ type: 'float' })
  durationSeconds: number;

  @OneToMany(() => DetectedObject, (object) => object.video)
  detectedObjects: DetectedObject[];

  @CreateDateColumn()
  createdAt: Date;
}

@Entity()
@Index(['video', 'frameIndex']) // 비디오별 프레임 검색 최적화
@Index(['latitude', 'longitude']) // 공간 검색 최적화
export class DetectedObject {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Video, (video) => video.detectedObjects)
  video: Video;

  @Column({ type: 'int' })
  frameIndex: number;

  @Column({ type: 'int' })
  trackId: number;

  @Column({ type: 'int' })
  classId: number;

  @Column({ type: 'float' })
  confidence: number;

  @Column({ type: 'float' })
  @Index() // 시간 기반 검색 최적화
  timestamp: number; // Unix timestamp (ms)

  // 객체 중심점 좌표
  @Column({ type: 'float' })
  latitude: number;

  @Column({ type: 'float' })
  longitude: number;

  @Column({ type: 'float' })
  altitude: number;

  // 원본 이미지상의 bbox (정규화된 좌표)
  @Column({ type: 'float' })
  bboxCenterX: number;

  @Column({ type: 'float' })
  bboxCenterY: number;

  @Column({ type: 'float' })
  bboxWidth: number;

  @Column({ type: 'float' })
  bboxHeight: number;

  // 지리좌표 bbox (GeoJSON 형식)
  @Column({ type: 'simple-json' })
  geoBbox: {
    type: 'Polygon';
    coordinates: number[][][]; // GeoJSON polygon coordinates
  };

  @CreateDateColumn()
  createdAt: Date;
}
