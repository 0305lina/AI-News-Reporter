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

## 실습용 — 여러 사용자 시나리오 (배포 없이)

같은 수업·스터디에서 **각자 이메일로 보고서 받기**를 연습할 때:

### 1) 같은 Wi-Fi에서 접속

```powershell
npm start
```

터미널에 `같은 Wi-Fi 실습용: http://192.168.x.x:3001` 주소가 출력됩니다.  
다른 사람은 그 주소로 접속 → 키워드 검색 → **본인 이메일** 입력 → 발송.

### 2) 이메일 모드 선택

| 목적 | 설정 | 방문자 경험 |
|------|------|-------------|
| **발송 흐름만 연습** | `EMAIL_USE_ETHEREAL=true` (기본) | 발송 후 **미리보기 링크**만 열림 (실제 수신함 X) |
| **실제 수신함까지 (소규모)** | Gmail SMTP 또는 Resend | 각자 입력한 주소로 **진짜 메일** 도착 |

**실습 추천 — Resend (무료, localhost OK)**

```env
RESEND_API_KEY=re_xxxx
EMAIL_FROM=News_AI <onboarding@resend.dev>
EMAIL_USE_ETHEREAL=false
```

- [resend.com](https://resend.com) 가입 → API Key 발급
- 배포 없이 로컬 서버에서도 **다른 사람 Gmail/네이버 등으로 발송 가능**
- 무료 한도 내에서 수업·데모에 충분

**소규모(10명 내외) — Gmail SMTP**

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=본인@gmail.com
SMTP_PASS=앱_비밀번호
EMAIL_FROM=News_AI <본인@gmail.com>
EMAIL_USE_ETHEREAL=false
```

- **받는 사람**은 누구든 가능 (각자 이메일 입력)
- **보내는 계정**은 본인 Gmail 1개만 서버에 등록
- 하루 약 500통 한도 — 실습용으론 보통 충분

### 3) Windows 방화벽

다른 기기 접속이 안 되면 PowerShell(관리자):

```powershell
New-NetFirewallRule -DisplayName "News_AI" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

---

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
- API 키는 `.env`에만 보관하고 Git에 커밋하지 마세요.
