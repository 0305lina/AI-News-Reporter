# News_AI · 키워드 뉴스 브리핑

검색 시점 기준 **최근 7일** 이내 키워드 관련 뉴스를 수집·요약하고, 이슈 보고서를 화면에 표시한 뒤 이메일로 즉시 발송하는 MVP입니다.

## 실행 방법

```powershell
cd "c:\Users\Skku\Desktop\260611_지수 바이브코딩 MVP\News_AI"
npm install
copy .env.example .env
# .env에 GEMINI_API_KEY 입력
npm run verify-gemini
npm start
```

브라우저에서 http://localhost:3001 접속

## 주요 기능

| 기능 | 설명 |
|------|------|
| 키워드 검색 | Gemini + Google Search Grounding으로 관련 뉴스 수집 |
| 뉴스 요약 | 검색창 하단에 기사별 핵심 요약 카드 표시 |
| 이슈 보고서 | 7일 뉴스를 종합한 headline·개요·핵심 bullet |
| 이메일 발송 | 검색 결과 확인 후 이메일 입력 → 즉시 HTML 보고서 발송 |

## 환경 변수 (.env)

| 변수 | 설명 |
|------|------|
| `GEMINI_API_KEY` | Google AI Studio API 키 |
| `GEMINI_MODEL` | 기본 `gemini-2.5-flash-lite` |
| `PORT` | 기본 `3001` |
| `SMTP_*` / `EMAIL_FROM` | 이메일 발송 (Gmail 앱 비밀번호 등) |

`GEMINI_API_KEY`가 없으면 **데모 모드**로 샘플 데이터를 표시합니다.


## Gmail SMTP 설정 예시

1. Google 계정 → 2단계 인증 활성화
2. 앱 비밀번호 생성
3. `.env`에 설정:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=16자리_앱_비밀번호
EMAIL_FROM=News_AI <your@gmail.com>
```

## API

- `GET /api/status` — Gemini·이메일 설정 상태
- `POST /api/search` — `{ "keyword": "AI" }`
- `POST /api/send-email` — `{ email, keyword, searchedAt, articles, report }`

## 프로젝트 구조

```
News_AI/
├── server.js
├── server/gemini-news.js
├── server/email.js
├── public/
└── scripts/verify-gemini.js
```

## 참고

- 동일 키워드는 8분간 서버 캐시됩니다.
- 7일 초과 기사는 서버에서 추가 필터링합니다.
