# FLOUT Admin Web

FLOUT은 반지하 주택의 침수 위험을 확인하고,
현장점검부터 예방시설 지원 및 시공까지 연결하는 침수 예방 플랫폼입니다.

이 저장소는 FLOUT의 운영자용 웹 프론트엔드입니다.

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Axios

## Getting Started

### 1. 저장소 클론

git clone https://github.com/CUK-FLOUT/flout-admin-web.git

### 2. 프로젝트 이동

cd flout-admin-web

### 3. 패키지 설치

npm install

### 4. 환경변수 설정

.env.example을 참고하여 .env.local 파일을 생성합니다.

### 5. 개발 서버 실행

npm run dev

## Branch Strategy

- main: 배포용 브랜치
- develop: 개발 통합 브랜치
- feat/\*: 기능 개발
- fix/\*: 버그 수정
- chore/\*: 환경 설정
- docs/\*: 문서 작업
