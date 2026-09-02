# Wish Port 백엔드 연결 가이드

## 먼저 이해할 한 문장

브라우저의 React 화면이 `fetch()`로 API 주소를 호출하고, API Route가 D1 데이터베이스 또는 R2 파일 저장소를 읽고 쓰는 구조입니다.

```text
React 화면 → HTTP 요청(GET/POST/PUT) → app/api의 Route → D1 또는 R2
                                      ↘ OpenAI API / Google OAuth
```

Postman에서 GET·POST·PUT을 확인해 본 경험이 있다면 이미 핵심 개념은 알고 있습니다. React는 Postman 대신 요청을 보내는 클라이언트라고 생각하면 됩니다.

## 현재 연결된 API

| Method | URL | 역할 |
| --- | --- | --- |
| GET | `/api/archive` | 저장된 프로필·경험·성과·Assets 조회 |
| PUT | `/api/archive` | Archive 전체 자동 저장 |
| GET | `/api/applications` | Tracking 목록 조회 |
| PUT | `/api/applications` | Tracking 상태 전체 저장 |
| GET | `/api/essays/current` | 현재 자소서 조회 |
| PUT | `/api/essays/current` | 현재 자소서 자동 저장 |
| POST | `/api/ai/regenerate` | 선택한 문항의 LLM 재생성 요청 |
| POST | `/api/files` | 사진·PDF·DOCX 파일을 R2에 업로드 |
| GET | `/api/auth/google/start` | Google 로그인 시작 |
| GET | `/api/auth/google/callback` | Google 로그인 결과 처리 |
| GET | `/api/auth/logout` | 세션 종료 |

## Postman으로 확인하기

로컬 서버를 먼저 실행합니다.

```bash
npm install
npm run dev
```

실행 로그에 나온 주소가 `http://localhost:3000`이라면 아래처럼 테스트합니다.

### 1. Archive 조회

- Method: `GET`
- URL: `http://localhost:3000/api/archive`
- Body: 없음

### 2. Archive 저장

- Method: `PUT`
- URL: `http://localhost:3000/api/archive`
- Header: `Content-Type: application/json`
- Body → raw → JSON:

```json
{
  "profile": {
    "name": "천그루",
    "role": "Product · AI · Frontend",
    "email": "groo@example.com",
    "phone": "010-0000-0000",
    "intro": "경험을 구조화하는 일을 좋아합니다."
  },
  "experiences": [
    {
      "title": "Wish Port",
      "meta": "PM · Frontend",
      "summary": "Career Context Workspace를 설계했습니다."
    }
  ],
  "extras": {
    "성과·자격": ["정보처리기사 · 준비 중"],
    "Assets": ["GitHub · github.com/example"]
  }
}
```

### 3. LLM 재생성

- Method: `POST`
- URL: `http://localhost:3000/api/ai/regenerate`
- Header: `Content-Type: application/json`
- Body:

```json
{
  "question": "협업 경험을 작성해 주세요.",
  "answer": "팀의 역할을 다시 나누었습니다.",
  "protectedText": ["일정 안에 프로젝트를 완료했습니다."]
}
```

`OPENAI_API_KEY`가 없으면 데모 제안이 반환되고, 키가 있으면 OpenAI Responses API를 호출합니다.

## Google 로그인 연결

1. Google Cloud Console에서 OAuth 2.0 Web Client를 만듭니다.
2. 승인된 Redirect URI에 아래 주소를 등록합니다.
   - 로컬: `http://localhost:3000/api/auth/google/callback`
   - 배포: `https://내-도메인/api/auth/google/callback`
3. `.env.local`을 만들고 `.env.example`의 값을 채웁니다.

```dotenv
GOOGLE_CLIENT_ID=발급받은-client-id
GOOGLE_CLIENT_SECRET=발급받은-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
OPENAI_API_KEY=발급받은-openai-api-key
OPENAI_MODEL=gpt-5.6-luna
```

비밀키는 React 컴포넌트나 Git 저장소에 넣으면 안 됩니다. 서버의 환경변수로만 보관합니다.

## 코드에서 요청이 연결되는 위치

- Archive 자동 저장: `components/wishport/archive-editor.tsx`
- Tracking 자동 저장: `app/tracking/page.tsx`
- 자소서 자동 저장·복사: `components/wishport/writing-editor.tsx`
- 데이터베이스 테이블 생성: `lib/server-db.ts`
- API 구현: `app/api/`

예를 들어 Archive 입력값이 바뀌면 React의 `useEffect`가 700ms 기다린 뒤 PUT 요청을 보냅니다. 사용자가 연속 입력할 때 매 글자마다 서버를 호출하지 않도록 하는 debounce입니다.

## 실제 서비스로 발전시킬 때 다음 순서

1. Google OAuth 환경변수를 설정합니다.
2. OpenAI API 키와 사용할 모델을 설정합니다.
3. D1 migration을 배포 환경에 적용합니다.
4. 현재의 문서 단위 JSON 저장을 유지하며 MVP를 검증합니다.
5. 검색·통계·협업 요구가 커질 때 경험, 문항, 지원서를 각각 별도 테이블로 정규화합니다.

지금 구조는 MVP에 적합합니다. 화면 상태와 서버 데이터의 경계가 단순해서 Postman으로 확인하기 쉽고, 나중에 테이블을 나누기도 어렵지 않습니다.
