// test/utils/test-database.ts

import { Flight, Video, DetectedObject } from '@/database/entities';
import { DataSource } from 'typeorm';

export const createTestDataSource = async () => {
  const dataSource = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    entities: [Flight, Video, DetectedObject],
    synchronize: true,
    logging: false,
  });

  await dataSource.initialize(); // <= 데이터베이스 초기화
  return dataSource;
};
