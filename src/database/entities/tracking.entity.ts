// src/database/entities/tracking.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Flight } from './flight.entity';

@Entity('trackings')
export class Tracking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  filePath: string;

  @Column()
  fileName: string;

  @Column({ type: 'text' })
  rawData: string;

  @Column({ type: 'text', nullable: true })
  processedData?: string;

  @ManyToOne(() => Flight, (flight) => flight.trackings, {
    onDelete: 'CASCADE',
  })
  flight: Flight;

  @CreateDateColumn()
  createdAt: Date;
}
