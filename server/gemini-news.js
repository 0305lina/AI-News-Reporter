const { normalizeReport, buildConsultingDemoReport } = require('./report-builder');

const MODELS = [
  process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
];

const CACHE_TTL_MS = 8 * 60 * 1000;
const cache = new Map();

function getSeoulNow() {
  return new Date();
}

function formatKoreanDate(date) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'full',
    timeZone: 'Asia/Seoul',
  }).format(date);
}

function parsePublishedAt(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isWithinLast7Days(publishedAt, searchedAt) {
  const pub = parsePublishedAt(publishedAt);
  if (!pub) return true;
  const ref = searchedAt instanceof Date ? searchedAt : new Date(searchedAt);
  const cutoff = new Date(ref.getTime() - 7 * 24 * 60 * 60 * 1000);
  return pub >= cutoff && pub <= ref;
}

function buildSystemPrompt(todayLabel) {
  return `당신은 글로벌 컨설팅 펌(McKinsey/BCG 수준)의 시니어 전략 애널리스트입니다.
오늘 날짜(검색 시점): ${todayLabel}

역할:
1. 사용자 키워드와 관련된 **최근 7일 이내** 뉴스만 수집하세요. Google 검색 도구로 실제 기사 URL·언론사를 확인하세요.
2. 각 기사마다 1~2문장 핵심 요약(summary)을 작성하세요.
3. report 필드에는 **경영진·전략 기획팀이 바로 활용할 수 있는** 상세 브리핑을 작성하세요.
4. 허위 URL·가짜 출처를 만들지 마세요.
5. 7일보다 오래된 기사는 articles에 넣지 마세요.

반드시 아래 JSON 형식만 출력하세요:
{
  "keyword": "키워드",
  "articles": [
    {
      "title": "기사 제목",
      "source": "언론사명",
      "publishedAt": "YYYY-MM-DD",
      "url": "https://...",
      "summary": "핵심 요약 1~2문장"
    }
  ],
  "report": {
    "headline": "한 줄 전략 제목",
    "executiveSummary": "경영진용 3~5문장. So What 중심.",
    "overview": "현황 종합 4~6문장",
    "marketContext": "시장·산업·거시 환경 3~5문장",
    "keyTrends": [
      { "title": "트렌드명", "description": "2~3문장 설명", "impact": "high|medium|low" }
    ],
    "keyPoints": ["핵심 takeaway 1", "핵심 takeaway 2"],
    "stakeholderImpact": [
      { "group": "정부/기업/투자자 등", "impact": "영향 설명" }
    ],
    "riskFactors": ["리스크 1", "리스크 2"],
    "opportunities": ["기회 1", "기회 2"],
    "strategicImplications": "전략적 시사점 3~5문장",
    "recommendedActions": [
      { "horizon": "단기|중기", "action": "권고 조치", "rationale": "근거" }
    ],
    "timeline": [
      { "date": "YYYY-MM-DD", "event": "주요 사건" }
    ],
    "outlook": "향후 1~2주 전망 2~4문장",
    "sources": [{ "name": "언론사", "url": "https://..." }]
  }
}

규칙:
- **모든 summary·report 필드는 반드시 자연스러운 한국어로 작성** (영문 기사도 summary는 한국어로 번역·요약)
- articles.title은 원문 제목 유지 가능, summary는 항상 한국어
- report의 headline·executiveSummary·overview 등 모든 텍스트 필드는 한국어
- recommendedActions.horizon 값은 「단기」「중기」만 사용
- articles 4~8건, 관련성·시의성 높은 순
- report 각 필드는 구체적·정량적 표현 우선 (가능한 경우)
- keyTrends 3~5개, recommendedActions 3~5개, stakeholderImpact 3~4개
- timeline은 articles 기반 주요 이벤트 3~6개
- 컨설팅 보고서 톤: 객관적, 구조적, 실행 가능한 권고 포함`;
}

function parseModelJson(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    throw new Error('AI 응답이 비어 있습니다.');
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(raw);
  } catch {
    const objectMatch = raw.match(/\{[\s\S]*\}/);
    if (objectMatch) return JSON.parse(objectMatch[0]);
    throw new Error('AI 응답 JSON 파싱에 실패했습니다.');
  }
}

function shouldTryNextModel(err) {
  const status = err.status ?? err.response?.status;
  const message = String(err.message || '');
  if (status === 401 || status === 403) return false;
  if (status === 429 || message.includes('429') || message.includes('quota')) return true;
  if (status === 404 || message.includes('not found')) return true;
  return false;
}

function getResponseText(result) {
  try {
    const text = result.response.text();
    if (text?.trim()) return text;
  } catch {
    /* fall through */
  }

  const parts = result.response.candidates?.[0]?.content?.parts || [];
  const joined = parts
    .map((part) => part.text || '')
    .join('')
    .trim();
  if (joined) return joined;

  const reason = result.response.candidates?.[0]?.finishReason;
  if (reason === 'SAFETY') {
    throw new Error('AI 안전 필터로 응답이 차단되었습니다. 다른 키워드로 시도해 주세요.');
  }
  throw new Error('AI 응답이 비어 있습니다.');
}

function getErrorMessage(err) {
  const status = err.status ?? err.response?.status;
  const message = String(err.message || '');

  if (status === 429 || message.includes('429') || message.includes('quota')) {
    return 'Gemini API 일일 무료 사용량을 초과했습니다. 내일 다시 시도하거나 Google AI Studio에서 결제를 활성화해 주세요.';
  }
  if (status === 401 || status === 403 || message.includes('API key') || message.includes('API_KEY')) {
    return 'Gemini API 키가 유효하지 않습니다. Google AI Studio에서 AIza로 시작하는 키를 .env에 설정해 주세요.';
  }
  if (status === 404 || message.includes('not found')) {
    return '요청한 AI 모델을 사용할 수 없습니다. .env의 GEMINI_MODEL을 확인해 주세요.';
  }
  if (message.includes('JSON') || message.includes('비어')) {
    return 'AI 응답 형식 오류입니다. 잠시 후 다시 검색해 주세요.';
  }
  if (message.includes('fetch') || message.includes('network') || message.includes('ECONN')) {
    return '네트워크 오류입니다. 인터넷 연결을 확인해 주세요.';
  }
  if (message.includes('SAFETY') || message.includes('차단')) {
    return message;
  }
  return `AI 응답 생성 중 오류가 발생했습니다. (${message.slice(0, 80) || '알 수 없는 오류'})`;
}

function normalizeArticle(article, searchedAt) {
  if (!article || typeof article !== 'object') return null;
  const title = String(article.title || '').trim();
  const url = String(article.url || '').trim();
  if (!title || !url.startsWith('http')) return null;

  return {
    title,
    source: String(article.source || '출처 미상').trim(),
    publishedAt: String(article.publishedAt || '').trim(),
    url,
    summary: String(article.summary || '').trim() || title,
  };
}

function filterAndNormalize(payload, keyword, searchedAt) {
  const articles = (payload.articles || [])
    .map((a) => normalizeArticle(a, searchedAt))
    .filter(Boolean)
    .filter((a) => isWithinLast7Days(a.publishedAt, searchedAt));

  const report = normalizeReport(payload.report, keyword, articles);

  return {
    keyword,
    searchedAt: searchedAt.toISOString(),
    demoMode: false,
    articles,
    report,
  };
}

async function generateWithFallback(genAI, prompt, options = {}) {
  const { systemInstruction, useSearch = false, jsonMode = false } = options;
  const uniqueModels = [...new Set(MODELS.filter(Boolean))];
  let lastError = null;

  for (const modelName of uniqueModels) {
    try {
      const config = {
        model: modelName,
        generationConfig: {
          temperature: jsonMode ? 0.2 : 0.4,
          ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      };
      if (systemInstruction) config.systemInstruction = systemInstruction;
      if (useSearch) config.tools = [{ googleSearch: {} }];

      const model = genAI.getGenerativeModel(config);
      const result = await model.generateContent(prompt);
      const text = getResponseText(result);
      return { text, modelName };
    } catch (err) {
      lastError = err;
      console.error(`Gemini API error (${modelName}):`, err.message);
      if (!shouldTryNextModel(err)) throw err;
    }
  }

  throw lastError;
}

async function collectNewsResearch(genAI, keyword, todayLabel) {
  const researchPrompt = `키워드 "${keyword}"와 관련된 뉴스를 컨설팅 리서치 관점에서 조사하세요.
오늘: ${todayLabel}
조건: ${todayLabel} 기준 최근 7일 이내 기사만, 실제 URL·언론사·게시일 포함.
**모든 요약·분석은 반드시 한국어로 작성**하세요.
각 기사: 제목, 출처, 날짜, URL, 한국어 요약 1~2문장, 시장/정책/기업 영향 한 줄.
추가: 주요 트렌드, 리스크, 기회, 이해관계자별 영향, 향후 1~2주 전망도 한국어 bullet로 정리하세요.`;

  const { text } = await generateWithFallback(genAI, researchPrompt, {
    useSearch: true,
    jsonMode: false,
  });
  return text;
}

async function structureNewsJson(genAI, keyword, todayLabel, researchText) {
  const structurePrompt = `아래 뉴스 조사 결과를 지정 JSON 스키마로 변환하세요.
키워드: "${keyword}"
검색 시점: ${todayLabel}
7일 초과 기사는 articles에서 제외하세요.

조사 결과:
${researchText}`;

  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { text } = await generateWithFallback(genAI, structurePrompt, {
        systemInstruction: buildSystemPrompt(todayLabel),
        useSearch: false,
        jsonMode: true,
      });
      return parseModelJson(text);
    } catch (err) {
      lastError = err;
      console.error(`JSON structure attempt ${attempt + 1} failed:`, err.message);
    }
  }
  throw lastError;
}

function getDemoResult(keyword) {
  const searchedAt = getSeoulNow();
  const today = searchedAt.toISOString().slice(0, 10);
  const dayAgo = new Date(searchedAt.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return {
    keyword,
    searchedAt: searchedAt.toISOString(),
    demoMode: true,
    articles: [
      {
        title: `${keyword} 관련 정부 정책 발표`,
        source: '데모뉴스',
        publishedAt: today,
        url: 'https://example.com/news/1',
        summary: `${keyword} 분야에 대한 새로운 지원 정책이 발표되어 업계 관심이 집중되고 있습니다.`,
      },
      {
        title: `${keyword} 시장 동향 분석`,
        source: '데모경제',
        publishedAt: dayAgo,
        url: 'https://example.com/news/2',
        summary: `전문가들은 ${keyword} 시장이 단기 변동성 속에서도 성장세를 이어갈 것으로 전망했습니다.`,
      },
      {
        title: `${keyword} 글로벌 이슈 리포트`,
        source: '데모글로벌',
        publishedAt: dayAgo,
        url: 'https://example.com/news/3',
        summary: `해외에서도 ${keyword} 관련 규제·투자 논의가 활발히 이어지고 있습니다.`,
      },
    ],
    report: (() => {
      const report = buildConsultingDemoReport(keyword);
      report.sources = [
        { name: '데모뉴스', url: 'https://example.com/news/1' },
        { name: '데모경제', url: 'https://example.com/news/2' },
      ];
      return report;
    })(),
  };
}

async function searchNews(keyword, { demoData } = {}) {
  const trimmed = String(keyword || '').trim();
  if (!trimmed) {
    const err = new Error('키워드를 입력해 주세요.');
    err.status = 400;
    throw err;
  }
  if (trimmed.length > 100) {
    const err = new Error('키워드는 100자 이내로 입력해 주세요.');
    err.status = 400;
    throw err;
  }

  const cacheKey = `${trimmed.toLowerCase()}:ko-v2`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const data = demoData || getDemoResult(trimmed);
    cache.set(cacheKey, { at: Date.now(), data });
    return data;
  }

  const searchedAt = getSeoulNow();
  const todayLabel = formatKoreanDate(searchedAt);

  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    let parsed;
    try {
      const researchText = await collectNewsResearch(genAI, trimmed, todayLabel);
      parsed = await structureNewsJson(genAI, trimmed, todayLabel, researchText);
    } catch (err) {
      console.error('Two-step search failed, trying single JSON call:', err.message);
      const prompt = `키워드: "${trimmed}"
${todayLabel} 기준 최근 7일 이내 관련 뉴스를 JSON으로 정리하세요.`;
      const { text } = await generateWithFallback(genAI, prompt, {
        systemInstruction: buildSystemPrompt(todayLabel),
        useSearch: true,
        jsonMode: false,
      });
      parsed = parseModelJson(text);
    }

    const data = filterAndNormalize(parsed, trimmed, searchedAt);
    cache.set(cacheKey, { at: Date.now(), data });
    return data;
  } catch (err) {
    console.error('Gemini search failed, using fallback demo:', err.message);
    const data = getDemoResult(trimmed);
    data.fallback = true;
    data.errorHint = getErrorMessage(err);
    data.report.overview = `AI 연동 오류로 샘플 데이터를 표시합니다. (${data.errorHint}) Google AI Studio에서 발급한 AIza… 키인지 확인해 주세요.`;
    cache.set(cacheKey, { at: Date.now(), data });
    return data;
  }
}

module.exports = {
  searchNews,
  getDemoResult,
  getErrorMessage,
  hasGeminiKey: () => Boolean(process.env.GEMINI_API_KEY),
};
