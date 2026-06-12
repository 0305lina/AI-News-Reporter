import { api } from './api-client.js';
import { searchHistory } from './search-history.js';

const searchForm = document.getElementById('searchForm');
const keywordInput = document.getElementById('keywordInput');
const searchBtn = document.getElementById('searchBtn');
const loadingBox = document.getElementById('loadingBox');
const alertBox = document.getElementById('alertBox');
const resultsSection = document.getElementById('resultsSection');
const resultsMeta = document.getElementById('resultsMeta');
const newsSummaries = document.getElementById('newsSummaries');
const issueReport = document.getElementById('issueReport');
const emailSection = document.getElementById('emailSection');
const emailForm = document.getElementById('emailForm');
const emailInput = document.getElementById('emailInput');
const emailBtn = document.getElementById('emailBtn');
const emailHint = document.getElementById('emailHint');
const statusBadge = document.getElementById('statusBadge');
const trendingKeywordsEl = document.getElementById('trendingKeywords');
const searchHistorySection = document.getElementById('searchHistorySection');
const searchHistoryEl = document.getElementById('searchHistory');

let lastSearchResult = null;
let appStatus = null;

function showAlert(message, type = 'error') {
  alertBox.textContent = message;
  alertBox.className = `alert alert--${type}`;
  alertBox.classList.remove('hidden');
}

function hideAlert() {
  alertBox.classList.add('hidden');
}

function setLoading(active) {
  loadingBox.classList.toggle('hidden', !active);
  searchBtn.disabled = active;
}

function formatSearchedAt(iso) {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Asia/Seoul',
    }).format(new Date(iso));
  } catch {
    return iso || '';
  }
}

function formatHistoryTime(iso) {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Seoul',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

function renderArticles(articles) {
  if (!articles?.length) {
    newsSummaries.innerHTML =
      '<div class="empty-state">최근 7일 이내 관련 뉴스를 찾지 못했습니다. 다른 키워드로 시도해 보세요.</div>';
    return;
  }

  newsSummaries.innerHTML = articles
    .map(
      (a) => `
      <article class="news-card">
        <h3>${escapeHtml(a.title)}</h3>
        <p class="news-summary">${escapeHtml(a.summary)}</p>
        <div class="news-meta">
          <span>${escapeHtml(a.source)}</span>
          <span>·</span>
          <span>${escapeHtml(a.publishedAt)}</span>
          <a class="news-link" href="${escapeAttr(a.url)}" target="_blank" rel="noopener noreferrer">원문 보기</a>
        </div>
      </article>`
    )
    .join('');
}

function renderList(items, className = 'report-points') {
  if (!items?.length) return '';
  return `<ul class="${className}">${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
}

function renderReportSection(title, content) {
  if (!content) return '';
  return `
    <section class="report-block">
      <h4 class="report-block-title">${escapeHtml(title)}</h4>
      ${content}
    </section>`;
}

function impactLabel(impact) {
  const map = { high: '높음', medium: '중간', low: '낮음' };
  return map[String(impact).toLowerCase()] || '중간';
}

function renderReport(report) {
  const trends = (report?.keyTrends || [])
    .map(
      (t) => `
      <div class="report-trend">
        <div class="report-trend-head">
          <strong>${escapeHtml(t.title)}</strong>
          <span class="report-impact">영향도 ${escapeHtml(impactLabel(t.impact))}</span>
        </div>
        <p>${escapeHtml(t.description)}</p>
      </div>`
    )
    .join('');

  const stakeholders = (report?.stakeholderImpact || [])
    .map((s) => `<li><strong>${escapeHtml(s.group)}</strong> — ${escapeHtml(s.impact)}</li>`)
    .join('');

  const actions = (report?.recommendedActions || [])
    .map(
      (a) => `
      <li>
        <span class="report-tag">${escapeHtml(a.horizon)}</span>
        <strong>${escapeHtml(a.action)}</strong>
        ${a.rationale ? `<p class="report-muted">${escapeHtml(a.rationale)}</p>` : ''}
      </li>`
    )
    .join('');

  const timeline = (report?.timeline || [])
    .map((t) => `<li>${t.date ? `<strong>${escapeHtml(t.date)}</strong> · ` : ''}${escapeHtml(t.event)}</li>`)
    .join('');

  const sources = (report?.sources || [])
    .map((s) => `<li><a href="${escapeAttr(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.name)}</a></li>`)
    .join('');

  issueReport.innerHTML = `
    <h3 class="report-headline">${escapeHtml(report?.headline || '전략 이슈 보고서')}</h3>
    ${renderReportSection('핵심 요약', `<p class="report-overview">${escapeHtml(report?.executiveSummary || '')}</p>`)}
    ${renderReportSection('현황 개요', `<p class="report-overview">${escapeHtml(report?.overview || '')}</p>`)}
    ${renderReportSection('시장·산업 환경', `<p class="report-overview">${escapeHtml(report?.marketContext || '')}</p>`)}
    ${renderReportSection('주요 트렌드', trends ? `<div class="report-trends">${trends}</div>` : '')}
    ${renderReportSection('핵심 시사점', renderList(report?.keyPoints))}
    ${renderReportSection('이해관계자 영향', stakeholders ? `<ul class="report-points">${stakeholders}</ul>` : '')}
    ${renderReportSection('리스크 요인', renderList(report?.riskFactors))}
    ${renderReportSection('기회 요인', renderList(report?.opportunities))}
    ${renderReportSection('전략적 함의', `<p class="report-overview">${escapeHtml(report?.strategicImplications || '')}</p>`)}
    ${renderReportSection('권고 조치', actions ? `<ul class="report-actions">${actions}</ul>` : '')}
    ${renderReportSection('주요 일정', timeline ? `<ul class="report-points">${timeline}</ul>` : '')}
    ${renderReportSection('향후 1~2주 전망', `<p class="report-overview">${escapeHtml(report?.outlook || '')}</p>`)}
    ${sources ? renderReportSection('출처', `<ul class="report-sources">${sources}</ul>`) : ''}
  `;
}

function updateEmailControls() {
  if (!emailHint || !emailBtn) return;

  if (appStatus && !appStatus.emailConfigured) {
    emailHint.textContent = '이메일 발송 설정이 없습니다.';
    emailHint.className = 'email-hint email-hint--warn';
    emailHint.classList.remove('hidden');
    emailBtn.disabled = true;
  } else if (appStatus?.emailTestMode) {
    emailHint.textContent =
      '테스트 발송 모드입니다. 실제 수신함 발송은 SMTP 또는 Resend 설정이 필요합니다.';
    emailHint.className = 'email-hint email-hint--warn';
    emailHint.classList.remove('hidden');
    emailBtn.disabled = false;
  } else {
    emailHint.textContent = '입력한 주소로 한국어 HTML 보고서가 발송됩니다.';
    emailHint.className = 'email-hint';
    emailHint.classList.remove('hidden');
    emailBtn.disabled = false;
  }
}

function renderResults(data) {
  const modeLabel = data.fallback
    ? ' · AI 오류 — 샘플 데이터'
    : data.demoMode
      ? ' · 데모 모드'
      : data.cached
        ? ' · 캐시'
        : '';
  resultsMeta.textContent = `키워드 "${data.keyword}" · 검색 시점 ${formatSearchedAt(data.searchedAt)} · 최근 7일 기준${modeLabel}`;

  if (data.fallback && data.errorHint) {
    showAlert(data.errorHint, 'error');
  }

  renderArticles(data.articles);
  renderReport(data.report);

  resultsSection.classList.remove('hidden');
  emailSection.classList.remove('hidden');
  updateEmailControls();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, '&#39;');
}

function renderSearchHistory() {
  const items = searchHistory.load();
  if (!searchHistorySection || !searchHistoryEl) return;

  if (!items.length) {
    searchHistorySection.classList.add('hidden');
    return;
  }

  searchHistorySection.classList.remove('hidden');
  searchHistoryEl.innerHTML = items
    .map(
      (item) => `
      <button type="button" class="trending-chip trending-chip--history" data-keyword="${escapeAttr(item.keyword)}" title="${escapeAttr(formatHistoryTime(item.searchedAt))}">
        ${escapeHtml(item.keyword)}
      </button>`
    )
    .join('');

  searchHistoryEl.querySelectorAll('.trending-chip').forEach((btn) => {
    btn.addEventListener('click', () => runSearch(btn.dataset.keyword));
  });
}

async function runSearch(keyword) {
  const trimmed = String(keyword || '').trim();
  if (!trimmed) {
    showAlert('키워드를 입력해 주세요.');
    return;
  }

  keywordInput.value = trimmed;
  hideAlert();
  setLoading(true);
  setTrendingDisabled(true);

  try {
    const data = await api.searchNews(trimmed);
    lastSearchResult = data;
    searchHistory.save(trimmed, {
      searchedAt: data.searchedAt,
      articleCount: data.articles?.length || 0,
    });
    renderSearchHistory();
    renderResults(data);
  } catch (err) {
    showAlert(err.message || '검색에 실패했습니다.');
  } finally {
    setLoading(false);
    setTrendingDisabled(false);
  }
}

function setTrendingDisabled(disabled) {
  document.querySelectorAll('.trending-chip').forEach((btn) => {
    btn.disabled = disabled;
  });
}

function renderTrendingKeywords(keywords) {
  if (!trendingKeywordsEl) return;
  trendingKeywordsEl.innerHTML = keywords
    .map(
      (kw) =>
        `<button type="button" class="trending-chip" data-keyword="${escapeAttr(kw)}">${escapeHtml(kw)}</button>`
    )
    .join('');

  trendingKeywordsEl.querySelectorAll('.trending-chip').forEach((btn) => {
    btn.addEventListener('click', () => runSearch(btn.dataset.keyword));
  });
}

async function loadTrendingKeywords() {
  if (!trendingKeywordsEl) return;
  trendingKeywordsEl.innerHTML =
    '<span class="trending-chip trending-chip--loading">키워드 불러오는 중…</span>';
  try {
    const data = await api.getTrending();
    renderTrendingKeywords(data.keywords || []);
  } catch {
    renderTrendingKeywords(['AI', '반도체', '금리', '지방선거', '환율']);
  }
}

async function initStatus() {
  try {
    appStatus = await api.getStatus();
    if (appStatus.demoMode) {
      statusBadge.textContent = '데모 모드';
      statusBadge.className = 'status-badge status-badge--demo';
    } else {
      statusBadge.textContent = 'Gemini 연동';
      statusBadge.className = 'status-badge status-badge--live';
    }
    updateEmailControls();
  } catch {
    statusBadge.textContent = '오프라인';
    statusBadge.className = 'status-badge';
  }
}

searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  await runSearch(keywordInput.value);
});

emailForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();

  if (!lastSearchResult) {
    showAlert('먼저 키워드를 검색해 주세요.');
    return;
  }

  const email = emailInput.value.trim();
  emailBtn.disabled = true;

  try {
    const result = await api.sendReport({
      email,
      keyword: lastSearchResult.keyword,
      searchedAt: lastSearchResult.searchedAt,
      articles: lastSearchResult.articles,
      report: lastSearchResult.report,
    });

    if (result.previewUrl) {
      window.open(result.previewUrl, '_blank', 'noopener');
      showAlert(`${result.message} 미리보기 탭을 확인해 주세요.`, 'success');
    } else {
      showAlert(result.message || `${email}(으)로 보고서를 발송했습니다.`, 'success');
    }
  } catch (err) {
    showAlert(err.message || '이메일 발송에 실패했습니다.');
  } finally {
    updateEmailControls();
  }
});

initStatus();
loadTrendingKeywords();
renderSearchHistory();
