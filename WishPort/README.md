# Wish Port

흩어진 커리어 경험을 Archive로 정리하고, 선택한 근거를 바탕으로 자기소개서를 생성·수정하는 React 웹앱입니다.

## 실행

```bash
npm install
cp .env.example .env
npm run dev
```

기본 주소는 `http://127.0.0.1:4173`입니다. API 키 없이도 데모 로그인과 데모 AI 응답으로 전체 흐름을 확인할 수 있습니다. Node.js 22.13 이상이 필요합니다.

## 데이터 저장

첫 로그인 시 `data/wishport.db` SQLite 데이터베이스가 자동으로 만들어지고, 한 묶음의 데모 데이터가 사용자별로 등록됩니다.

- 기본정보, 증명사진, 경험, 성과·자격, Assets 추가·수정·삭제
- 세분화된 인적사항, 학력, 경력, 웹사이트 정보
- 자기소개서별 채용공고·직무기술서와 최고 진행 단계
- 문항별 선택 경험, 초안, 피드백 유형·하이라이트·제안 반영 상태
- 문항별 글자 수, 작성 규칙, 블라인드 모드, 문체 참고 자료
- 지원 현황과 연결된 자기소개서

Archive에서 등록한 경험은 문항 설계 화면에 즉시 나타납니다. 경험을 삭제하면 자기소개서 문항과의 연결만 함께 정리되며, 기존 초안은 보존됩니다.

## Google 로그인

Google Cloud Console에서 Web application OAuth Client ID를 만든 뒤 `.env`에 설정합니다.

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
SESSION_SECRET=long-random-secret
```

승인된 JavaScript 원본에 로컬 주소와 실제 배포 주소를 추가해야 합니다. 브라우저가 받은 Google ID 토큰은 Node 서버가 Google 검증 엔드포인트로 확인한 뒤 HttpOnly 세션 쿠키로 전환합니다.

## LLM 연결

```env
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-5-mini
```

키는 브라우저로 전달되지 않으며 `/api/llm/essay` 서버 라우트에서만 사용됩니다. 현재 API 키가 없으면 근거 선택, 생성, 수정 UI를 검증할 수 있도록 데모 응답을 반환합니다.

## 주요 화면

- Landing / Google 로그인
- 읽기 전용 표준 이력서 Overview / A4 한 페이지 PDF 인쇄 / JSON·TXT Archive 내보내기
- 저장된 항목 목록과 입력 폼 중심의 Archive Editor
- Writing House / 채용공고·직무기술서·문항별 글자 수 입력
- Essay Design / 문항별 경험, Rules, Reference
- Writing & Feedback / 유형별 드래그 하이라이트, 원문·제안 비교, STAR 근거
- State Tracking / 지원 추가·삭제·상태 변경
- 이전 단계 재진입이 가능한 세로 진행 바
