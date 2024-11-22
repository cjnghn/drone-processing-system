// src/infrastructure/database/entities/flight.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('flights')
export class FlightEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;
}
