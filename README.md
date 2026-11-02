# FLOUT Admin Web

### 침수 위험을 살피고, 더 안전한 일상을 연결합니다.

**FLOUT**은 반지하 주택의 침수 위험을 확인하고,
현장점검부터 예방시설 지원 및 시공까지 연결하는
**침수 예방 플랫폼**입니다.

이 저장소는 FLOUT의 **운영자용 웹 프론트엔드**입니다.

---

## About

FLOUT Admin Web은 침수 예방 업무를 담당하는 운영자가
현장점검과 지원 절차를 효율적으로 관리할 수 있도록 돕습니다.

| Section        | Description                   |
| -------------- | ----------------------------- |
| Dashboard      | 주요 현황 및 업무 현황 확인   |
| Inspection     | 현장점검 신청 및 결과 관리    |
| Support        | 침수 예방시설 지원 절차 관리  |
| Infrastructure | 지역 및 공공 인프라 정보 관리 |

---

## Tech Stack

| Category    | Technology   |
| ----------- | ------------ |
| Framework   | React        |
| Language    | TypeScript   |
| Build Tool  | Vite         |
| Styling     | Tailwind CSS |
| Routing     | React Router |
| HTTP Client | Axios        |

---

## Getting Started

### 1. Clone Repository

```bash
git clone https://github.com/CUK-FLOUT/flout-admin-web.git
cd flout-admin-web
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

`.env.example`을 참고하여 `.env.local` 파일을 생성합니다.

API 서버 주소 등 필요한 환경변수를 설정합니다.

### 4. Run Development Server

```bash
npm run dev
```

---

## Branch Strategy

`main`과 `develop`을 중심으로 작업 목적에 따라 브랜치를 분리합니다.

| Branch       | Description                   |
| ------------ | ----------------------------- |
| `main`       | 배포용 브랜치                 |
| `develop`    | 개발 통합 브랜치              |
| `feat/*`     | 새로운 기능 및 UI 구현        |
| `api/*`      | 백엔드 API 연동               |
| `fix/*`      | 버그 수정                     |
| `refactor/*` | 기능 변경 없는 코드 구조 개선 |
| `chore/*`    | 개발 환경 및 설정 관리        |
| `docs/*`     | 문서 작성 및 수정             |

### Branch Naming

```text
feat/support
api/support
fix/support-status
refactor/support-components
chore/api-issue-template
docs/readme
```

작업 브랜치는 `develop`에서 생성하며,
작업 완료 후 Pull Request를 통해 병합합니다.

---

## Issue & Pull Request

모든 작업은 GitHub Issue를 기반으로 관리합니다.

### Issue Convention

| Type       | Description            |
| ---------- | ---------------------- |
| `FEAT`     | 기능 및 화면 구현      |
| `API`      | 백엔드 API 연동        |
| `FIX`      | 오류 수정              |
| `REFACTOR` | 코드 구조 개선         |
| `CHORE`    | 환경 설정 및 기타 작업 |
| `DOCS`     | 문서 작성 및 수정      |

### Issue Naming

```text
[FEAT] 지원 관리 화면 구현
[API] 지원 관리 API 연동
[FIX] 지원 상태 표시 오류 수정
[CHORE] API 연동 이슈 템플릿 추가
[DOCS] README 업데이트
```

Pull Request에는 관련 이슈 및 브랜치,
주요 변경사항과 확인 내용을 작성합니다.

UI 변경이 있는 경우 변경 화면을 함께 첨부합니다.

---

## API Integration

FLOUT Admin Web은 백엔드 API와 연동하여
운영자에게 필요한 데이터를 조회하고 관리합니다.

API 연동 작업은 섹션별 브랜치로 구분합니다.

```text
api/auth
api/dashboard
api/inspection
api/support
api/infrastructure
```

API 요청에는 Axios를 사용하며,
백엔드 API 명세를 기준으로 연동합니다.

인증이 필요한 요청은 백엔드 인증 방식에 맞춰 처리합니다.
