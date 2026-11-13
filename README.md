# FLOUT Admin Web

> 침수 위험 확인부터 현장점검·예방시설 지원·시공까지 연결하는 FLOUT의 운영자 웹입니다.

FLOUT은 부천시 반지하 주택 주민을 위한 침수 예방 플랫폼입니다. 운영자는 주민이 제출한 신청을 지도에서 확인하고, 우선점검 지정부터 점검 결과 공개·지원 검토·시공 완료까지 업무를 관리합니다. 지역·공공시설 문제는 공공인프라 관리에서 별도로 검토합니다.

[운영자 웹](https://flout-admin-web.vercel.app/login) · [백엔드 Swagger](https://api.flout.shop/swagger-ui/index.html) · [주민용 프론트엔드](https://github.com/CUK-FLOUT/flout-resident-webapp)

## 담당자

| 프로필 | 이름 · GitHub | 담당 |
| :---: | --- | --- |
| <a href="https://github.com/soletsgooooo"><img src="https://github.com/soletsgooooo.png?size=200" width="100" height="100" alt="고은우 GitHub 프로필 사진" /></a> | **고은우**<br>[@soletsgooooo](https://github.com/soletsgooooo) | 운영자 프론트엔드 — 화면 구현, 백엔드 API 연동, 지도·인증·공통 UI 및 QA 수정 |

## 주요 기능

| 화면 | 주요 기능 | 기본 경로 |
| --- | --- | --- |
| 운영자 로그인 | 이메일·Google 로그인, 토큰 재발급, 로그아웃 | `/login` |
| GIS 신청 관리 | 신청 검색·필터, 지도 마커·현황, 신청 상세 및 내부 메모 | `/gis` |
| 우선점검 관리 | 후보 비교, 복수 지정·취소, 전체 지정 대상의 선정 순서 변경·저장 | `/priority` |
| 현장점검 관리 | 상태별 목록, 담당자·방문 일정 배정, 저장된 배정 정보 조회 | `/inspection` |
| 점검 결과 | 취약지점·전문가 의견 입력, 사진 첨부, 임시 저장 및 주민 공개 | `/inspection/:requestId/results` |
| 지원 관리 | 신청 현황·목록·상세, 자격 검토, 승인·미승인 처리 | `/support` |
| 시공 관리 | 시공 대상·상세 조회, 일정 저장, 사진 첨부 및 전체 완료 처리 | `/construction` |
| 공공인프라 관리 | 지역 문제 지도·목록, 검토 내용 저장, 조치 결과·사진 등록 | `/infrastructure` |

`/`로 접속하면 GIS 신청 관리로 이동합니다. 운영자 업무 화면에는 인증이 필요합니다.

## 기술 스택

| 구분 | 사용 기술 |
| --- | --- |
| UI | React 19, TypeScript 6 |
| 개발·빌드 | Vite 8 |
| 스타일 | Tailwind CSS 4 |
| 라우팅 | React Router 7 |
| API 통신 | Axios |
| 지도·로그인 | Kakao Maps JavaScript SDK, Google Identity Services |
| 검증 | ESLint, TypeScript, Node.js 기본 테스트 러너 |

API 데이터 조회와 주기적 갱신은 페이지별 훅 및 공통 `usePagePolling`으로 관리합니다.

## 로컬 실행

Node.js **22.12 이상**과 npm을 사용합니다.

```bash
git clone https://github.com/CUK-FLOUT/flout-admin-web.git
cd flout-admin-web
git switch develop
npm ci
cp .env.example .env.local
```

`.env.local`을 아래 환경에 맞게 설정한 뒤 실행합니다.

```bash
npm run dev
```

기본 개발 주소는 `http://localhost:5173`입니다. 운영자 계정과 API 서버 연결 정보는 프로젝트 담당자에게 확인합니다.

### 환경변수

```dotenv
# 로컬 백엔드를 사용할 때
VITE_API_BASE_URL=http://localhost:8080

# Google 웹 클라이언트 ID
VITE_GOOGLE_CLIENT_ID=your-google-web-client-id

# Kakao JavaScript 앱 키
VITE_KAKAO_MAP_KEY=your-kakao-javascript-key
```

| 변수 | 용도 | 참조 위치 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | 백엔드 API 서버 기본 주소 | [API 클라이언트](src/api/client.ts), [인증 전용 클라이언트](src/api/authTransport.ts) |
| `VITE_GOOGLE_CLIENT_ID` | 운영자 Google 로그인 | [Google 로그인](src/auth/google.ts) |
| `VITE_KAKAO_MAP_KEY` | GIS·공공인프라 지도 SDK 로드 | [Kakao Maps 로더](src/lib/kakao/maps.ts) |

- 배포 백엔드에 연결할 때는 `VITE_API_BASE_URL=https://api.flout.shop`을 사용합니다.
- API 함수가 `/api/...` 경로를 포함하므로 기본 주소 끝에는 **`/api`를 붙이지 않습니다.**
- `.env.example`의 기본 항목에 지도 키를 추가해 설정합니다. Google·Kakao의 허용 도메인 설정은 프로젝트 담당자에게 확인합니다.
- `VITE_` 변수는 브라우저 코드에 포함됩니다. 서버용 비밀키·비밀번호·인증 토큰을 넣지 않습니다.

## 프로젝트 구조

```text
flout-admin-web/
├── .github/                 # 이슈·PR 템플릿, 제목 규칙 확인 워크플로
├── src/
│   ├── api/                 # 도메인별 API 함수·요청/응답 타입, Axios 클라이언트
│   ├── auth/                # 세션, 보호 라우트, Google 로그인, 리다이렉트 검증
│   ├── assets/              # 화면별 아이콘·이미지
│   ├── components/
│   │   ├── common/          # 드롭다운, 페이지네이션, 이미지·검색창 공통 스타일
│   │   ├── layout/          # 사이드바, 헤더, 계정 메뉴, 현재 시각
│   │   └── .../             # gis·priority·inspection·support·construction 등
│   ├── hooks/               # 공통 Polling 훅 및 요청 수명 관리
│   ├── lib/                 # Kakao Maps SDK 로더, 사진 저장 유틸리티
│   ├── pages/
│   │   ├── Auth/            # 운영자 로그인
│   │   ├── GIS/             # GIS 신청 관리
│   │   ├── Priority/        # 우선점검 관리
│   │   ├── Inspection/      # 현장점검·배정
│   │   ├── InspectionResults/ # 점검 결과 작성·조회
│   │   ├── Support/         # 지원 신청·자격 검토
│   │   ├── Construction/    # 시공 일정·사진·완료 처리
│   │   └── Infrastructure/  # 지역·공공 문제 검토·조치
│   ├── App.tsx              # 화면 라우팅
│   ├── main.tsx             # React 진입점
│   └── index.css            # 공통 스타일
├── tests/                   # 인증·API·상태·저장·UI 동작 회귀 테스트
├── .env.example             # 기본 환경변수 예시
├── package.json             # 실행·검증 명령
└── vite.config.ts           # React·Tailwind Vite 플러그인 설정
```

## 구현 구조

### API·인증

- 업무 요청은 [공통 Axios 클라이언트](src/api/client.ts)를 사용하며, 세션의 Access Token을 자동 첨부합니다.
- 토큰 갱신과 로그아웃은 [인증 API](src/api/auth.ts) 및 인증 전용 클라이언트를 사용합니다.
- 세션은 [sessionStorage 기반 세션 모듈](src/auth/session.ts)에서 관리하고, [RequireAdmin](src/auth/RequireAdmin.tsx)이 업무 화면 접근을 제어합니다.
- 서버 공통 응답의 `result`를 도메인별 API 모듈에서 처리하고, 화면에 필요한 표시 값은 페이지별 매핑 코드로 변환합니다.
- 상세 경로의 `requestId`는 각 화면이 사용하는 신청·점검·지원·시공 식별자에 연결됩니다. API 호출에는 해당 도메인의 ID를 사용합니다.

### 목록 갱신·편집 상태

- GIS·우선점검·현장점검·지원 신청의 주요 목록은 [공통 Polling 훅](src/hooks/usePagePolling.ts)으로 기본 30초 간격 재조회합니다.
- 비활성 탭에서는 재조회를 멈추고, 복귀 시 갱신합니다. 중복 요청·취소·실패 후 재시도도 공통 처리합니다.
- 상세 입력과 목록 재조회를 분리하고, 우선점검 복수 선택·순서 변경 중에는 해당 목록의 Polling을 중단합니다.
- GIS 목록의 페이지당 조회 건수는 목록 영역 높이에 맞춰 조절합니다.
- 시공의 미저장 일정·사진 초안은 운영자·시공 ID별로 IndexedDB에 보관합니다. 사진 첨부·삭제 후 실제 서버 저장 시점은 화면의 저장·완료 처리 흐름을 따릅니다.

## 검증 명령

```bash
# 정적 검사
npm run lint

# TypeScript 검사 및 프로덕션 빌드
npm run build

# 전체 테스트
node --experimental-strip-types --test tests/*.test.mjs

# 빌드 결과 로컬 확인
npm run preview
```

도메인별 테스트도 실행할 수 있습니다.

```bash
npm run test:auth
npm run test:priority
npm run test:inspection
npm run test:support
npm run test:gis
npm run test:construction
npm run test:infrastructure
npm run test:photo
npm run test:polling
```

테스트는 Mock API·저장소·타이머 등을 사용합니다. 실제 서버 연결, 로그인 권한, 지도 키·도메인, 파일 업로드는 연결된 환경에서 별도로 확인합니다.

## 배포

운영자 웹은 Vite 정적 빌드 결과인 `dist/`를 배포합니다.

| 항목 | 값 |
| --- | --- |
| 배포 서비스 | Vercel |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| API 기본 주소 | `https://api.flout.shop` |

배포 환경에도 위의 환경변수 3개를 설정합니다. 배포 후 `/login`과 상세 URL 직접 접근, 로그인·로그아웃, 지도 표시 및 API 요청을 확인합니다.

## 협업 규칙

작업 목적에 맞게 브랜치를 구분하고, `develop`을 대상으로 Pull Request를 작성합니다.

| 브랜치 | 용도 |
| --- | --- |
| `main` | 배포 기준 |
| `develop` | 개발 통합 |
| `feat/*` | 기능·화면 구현 |
| `api/*` | 백엔드 API 연동 |
| `fix/*` | 오류·QA 수정 |
| `refactor/*` | 기능 변경 없는 구조 개선 |
| `chore/*` | 개발 환경·설정 |
| `docs/*` | 문서 작성·수정 |

이슈와 PR은 [저장소 템플릿](.github)을 사용합니다. 변경 목적·관련 이슈·검증 결과를 기록하고, UI 수정에는 변경 화면을 첨부합니다.
