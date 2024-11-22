// src/database/entities/video.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Flight } from './flight.entity';

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  filePath: string;

  @Column()
  fileName: string;

  @Column({ type: 'float', nullable: true })
  durationSeconds?: number;

  @ManyToOne(() => Flight, (flight) => flight.videos, {
    onDelete: 'CASCADE',
  })
  flight: Flight;

  @CreateDateColumn()
  createdAt: Date;
}
