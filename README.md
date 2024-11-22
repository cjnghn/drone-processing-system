// README.md

# Drone Processing System

## 개발 환경 설정

### 사전 요구사항

- Docker
- Docker Compose
- Node.js 18+
- npm 9+

### 데이터베이스 설정

1. Docker 컨테이너 시작:

```bash
cd docker
docker-compose up -d
```

2. 데이터베이스 접속 정보:

- Host: localhost
- Port: 5432
- Database: drone_processing
- Username: postgres
- Password: postgres

### pgAdmin 접속

- URL: http://localhost:5050
- Email: admin@admin.com
- Password: admin

### 주의사항

- 데이터베이스 볼륨은 영구 저장됩니다. 완전히 초기화하려면:
  ```bash
  docker-compose down -v
  ```
- 개발 환경에서만 사용하세요. 프로덕션 환경에서는 보안 설정을 변경해야 합니다.

## PostGIS 기능

- 공간 데이터 저장 및 쿼리
- 공간 인덱싱
- 거리 계산
- 지오메트리 연산

## 주요 기능

- 드론 비행 데이터 처리
- 객체 추적 데이터 저장
- 공간 쿼리 지원
- 시계열 데이터 분석
