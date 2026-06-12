require('dotenv').config();
const express = require('express');
const path = require('path');
const geminiNews = require('./server/gemini-news');
const emailService = require('./server/email');
const trendingKeywords = require('./server/trending-keywords');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/status', (_req, res) => {
  const emailStatus = emailService.getEmailStatus();
  res.json({
    hasGeminiKey: geminiNews.hasGeminiKey(),
    demoMode: !geminiNews.hasGeminiKey(),
    emailConfigured: emailStatus.configured,
    emailMode: emailStatus.mode,
    emailTestMode: emailStatus.isTestMode,
    emailMessage: emailStatus.message,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
    message: geminiNews.hasGeminiKey()
      ? 'Gemini API 연동 — Google 검색 기반 뉴스 수집'
      : '데모 모드 — GEMINI_API_KEY를 .env에 설정하세요',
  });
});

app.get('/api/trending', async (_req, res) => {
  try {
    const data = await trendingKeywords.fetchTrendingKeywords();
    res.json(data);
  } catch (err) {
    res.json({ keywords: trendingKeywords.DEFAULT_KEYWORDS, source: 'default' });
  }
});

app.post('/api/search', async (req, res) => {
  const { keyword } = req.body ?? {};
  try {
    const data = await geminiNews.searchNews(keyword);
    res.json(data);
  } catch (err) {
    const status = err.status || 500;
    const message =
      status >= 500 ? geminiNews.getErrorMessage(err) : err.message || '검색 중 오류가 발생했습니다.';
    console.error('Search error:', err);
    res.status(status).json({ error: message });
  }
});

app.post('/api/send-email', async (req, res) => {
  const { email, keyword, searchedAt, articles, report } = req.body ?? {};
  try {
    const result = await emailService.sendReportEmail(email, {
      keyword,
      searchedAt,
      articles,
      report,
    });
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    console.error('Email error:', err);
    res.status(status).json({ error: err.message || '이메일 발송에 실패했습니다.' });
  }
});

app.post('/api/email/preview', (req, res) => {
  const { keyword, searchedAt, articles, report } = req.body ?? {};
  try {
    const preview = emailService.previewReportEmail({
      keyword,
      searchedAt,
      articles,
      report,
    });
    res.json(preview);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || '미리보기 생성에 실패했습니다.' });
  }
});

app.listen(PORT, HOST, () => {
  const os = require('os');
  const nets = os.networkInterfaces();
  const lan = Object.values(nets)
    .flat()
    .find((n) => n && n.family === 'IPv4' && !n.internal)?.address;

  console.log(`News_AI server running at http://localhost:${PORT}`);
  if (lan) console.log(`같은 Wi-Fi 실습용: http://${lan}:${PORT}`);
});
