import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flight } from './flight.entity';
import { Video } from './video.entity';
import { Tracking } from './tracking.entity';

describe('비행 엔티티 (Flight Entity)', () => {
  let flightRepository: Repository<Flight>;
  let videoRepository: Repository<Video>;
  let trackingRepository: Repository<Tracking>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Flight, Video, Tracking],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([Flight, Video, Tracking]),
      ],
    }).compile();

    flightRepository = moduleRef.get('FlightRepository');
    videoRepository = moduleRef.get('VideoRepository');
    trackingRepository = moduleRef.get('TrackingRepository');
  });

  describe('기본 CRUD 테스트', () => {
    it('비행 데이터를 생성할 수 있어야 한다', async () => {
      // given
      const flight = new Flight();
      flight.name = '테스트 비행';
      flight.flightDate = new Date('2024-01-01');
      flight.cameraFov = 84;
      flight.logFilePath = 'test.csv';

      // when
      const savedFlight = await flightRepository.save(flight);

      // then
      expect(savedFlight.id).toBeDefined();
      expect(savedFlight.name).toBe('테스트 비행');
      expect(savedFlight.createdAt).toBeDefined();
    });

    it('비행 데이터를 조회할 수 있어야 한다', async () => {
      // given
      const flight = new Flight();
      flight.name = '조회 테스트';
      flight.flightDate = new Date('2024-01-01');
      flight.cameraFov = 84;
      flight.logFilePath = 'test.csv';
      await flightRepository.save(flight);

      // when
      const foundFlight = await flightRepository.findOne({
        where: { name: '조회 테스트' },
      });

      // then
      expect(foundFlight).toBeDefined();
      expect(foundFlight.name).toBe('조회 테스트');
    });
  });

  describe('관계 테스트', () => {
    it('비행에 비디오와 트래킹 데이터를 함께 저장할 수 있어야 한다', async () => {
      // given
      const flight = new Flight();
      flight.name = '관계 테스트 비행';
      flight.flightDate = new Date('2024-01-01');
      flight.cameraFov = 84;
      flight.logFilePath = 'test.csv';

      const video = new Video();
      video.fileName = 'test.mp4';
      video.filePath = '/videos/test.mp4';

      const tracking = new Tracking();
      tracking.fileName = 'tracking.json';
      tracking.filePath = '/trackings/test.json';
      tracking.rawData = '{}';

      flight.videos = [video];
      flight.trackings = [tracking];

      // when
      await flightRepository.save(flight);
      const foundFlight = await flightRepository.findOne({
        where: { id: flight.id },
        relations: ['videos', 'trackings'],
      });

      // then
      expect(foundFlight.videos).toHaveLength(1);
      expect(foundFlight.trackings).toHaveLength(1);
      expect(foundFlight.videos[0].fileName).toBe('test.mp4');
      expect(foundFlight.trackings[0].fileName).toBe('tracking.json');
    });

    it('비행 삭제 시 연관된 비디오와 트래킹도 함께 삭제되어야 한다', async () => {
      // given
      const flight = new Flight();
      flight.name = '삭제 테스트 비행';
      flight.flightDate = new Date('2024-01-01');
      flight.cameraFov = 84;
      flight.logFilePath = 'test.csv';

      const video = new Video();
      video.fileName = 'delete-test.mp4';
      video.filePath = '/videos/delete-test.mp4';
      video.flight = flight;

      const tracking = new Tracking();
      tracking.fileName = 'delete-test.json';
      tracking.filePath = '/trackings/delete-test.json';
      tracking.rawData = '{}';
      tracking.flight = flight;

      flight.videos = [video];
      flight.trackings = [tracking];

      await flightRepository.save(flight);

      // when
      await flightRepository.remove(flight);

      // then
      const videos = await videoRepository.find();
      const trackings = await trackingRepository.find();
      expect(videos).toHaveLength(0);
      expect(trackings).toHaveLength(0);
    });
  });
});
