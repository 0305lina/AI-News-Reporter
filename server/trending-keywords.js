const DEFAULT_KEYWORDS = [
  'AI',
  '반도체',
  '지방선거',
  '금리',
  '삼성전자',
  '트럼프',
  '원전',
  'K팝',
  '부동산',
  '환율',
];

const CACHE_TTL_MS = 60 * 60 * 1000;
let cache = { at: 0, keywords: DEFAULT_KEYWORDS };

function parseKeywordJson(text) {
  const trimmed = String(text || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : trimmed;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.keywords)) return parsed.keywords;
  } catch {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed;
    }
  }
  return null;
}

function normalizeKeywords(list) {
  if (!Array.isArray(list)) return DEFAULT_KEYWORDS;
  return [...new Set(list.map((k) => String(k).trim()).filter((k) => k && k.length <= 30))].slice(
    0,
    10
  );
}

async function fetchTrendingKeywords() {
  if (Date.now() - cache.at < CACHE_TTL_MS && cache.keywords?.length) {
    return { keywords: cache.keywords, cached: true, source: cache.source || 'cache' };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    cache = { at: Date.now(), keywords: DEFAULT_KEYWORDS, source: 'default' };
    return { keywords: DEFAULT_KEYWORDS, cached: false, source: 'default' };
  }

  const todayLabel = new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'full',
    timeZone: 'Asia/Seoul',
  }).format(new Date());

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
      tools: [{ googleSearch: {} }],
      generationConfig: { temperature: 0.3 },
    });

    const prompt = `오늘(${todayLabel}) 한국에서 뉴스·검색량이 많은 핫 키워드 10개를 JSON 배열로만 출력하세요.
예: ["AI","반도체",...]
조건: 최근 7일 이슈, 한국어 키워드 위주, 2~15자, 중복·특수문자 없음`;

    const result = await model.generateContent(prompt);
    let text = '';
    try {
      text = result.response.text();
    } catch {
      text = (result.response.candidates?.[0]?.content?.parts || [])
        .map((p) => p.text || '')
        .join('');
    }

    const parsed = parseKeywordJson(text);
    const keywords = normalizeKeywords(parsed);
    if (keywords.length >= 5) {
      cache = { at: Date.now(), keywords, source: 'gemini' };
      return { keywords, cached: false, source: 'gemini' };
    }
  } catch (err) {
    console.error('Trending keywords error:', err.message);
  }

  cache = { at: Date.now(), keywords: DEFAULT_KEYWORDS, source: 'default' };
  return { keywords: DEFAULT_KEYWORDS, cached: false, source: 'default' };
}

module.exports = { fetchTrendingKeywords, DEFAULT_KEYWORDS };
