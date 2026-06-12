function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeKeyTrends(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') {
        return { title: item.slice(0, 80), description: item, impact: 'medium' };
      }
      if (!item || typeof item !== 'object') return null;
      const title = String(item.title || item.trend || '').trim();
      const description = String(item.description || item.detail || '').trim();
      if (!title && !description) return null;
      return {
        title: title || description.slice(0, 60),
        description: description || title,
        impact: String(item.impact || 'medium').trim(),
      };
    })
    .filter(Boolean);
}

function normalizeStakeholderImpact(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return { group: '이해관계자', impact: item };
      if (!item || typeof item !== 'object') return null;
      const group = String(item.group || item.stakeholder || '').trim();
      const impact = String(item.impact || item.description || '').trim();
      if (!group || !impact) return null;
      return { group, impact };
    })
    .filter(Boolean);
}

function normalizeRecommendedActions(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return { horizon: '단기', action: item, rationale: '' };
      if (!item || typeof item !== 'object') return null;
      const action = String(item.action || item.recommendation || '').trim();
      if (!action) return null;
      return {
        horizon: String(item.horizon || item.term || '단기').trim(),
        action,
        rationale: String(item.rationale || item.reason || '').trim(),
      };
    })
    .filter(Boolean);
}

function normalizeTimeline(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return { date: '', event: item };
      if (!item || typeof item !== 'object') return null;
      const event = String(item.event || item.title || '').trim();
      if (!event) return null;
      return {
        date: String(item.date || item.publishedAt || '').trim(),
        event,
      };
    })
    .filter(Boolean);
}

function normalizeSources(value, articles) {
  const sources = Array.isArray(value)
    ? value
        .map((s) => ({
          name: String(s?.name || '').trim(),
          url: String(s?.url || '').trim(),
        }))
        .filter((s) => s.name && s.url.startsWith('http'))
    : [];

  (articles || []).forEach((a) => {
    if (!sources.some((s) => s.url === a.url)) {
      sources.push({ name: a.source, url: a.url });
    }
  });

  return sources.slice(0, 15);
}

function normalizeReport(report, keyword, articles) {
  const r = report && typeof report === 'object' ? report : {};
  const keyPoints = normalizeStringList(r.keyPoints);
  const keyTrends = normalizeKeyTrends(r.keyTrends);
  const fallbackPoints = articles.slice(0, 5).map((a) => a.summary);

  return {
    headline: String(r.headline || `${keyword} 최근 7일 전략 이슈 브리핑`).trim(),
    executiveSummary: String(
      r.executiveSummary ||
        r.summary ||
        r.overview ||
        (articles.length
          ? `최근 7일간 "${keyword}" 관련 ${articles.length}건의 주요 뉴스를 분석한 결과, 업계·정책·시장 측면에서 구조적 변화 신호가 관측됩니다.`
          : `최근 7일 이내 "${keyword}" 관련 공개된 주요 뉴스가 제한적입니다.`)
    ).trim(),
    overview: String(
      r.overview ||
        (articles.length
          ? `${keyword} 이슈는 최근 일주일간 다수의 매체에서 다뤄졌으며, 단기 이벤트와 중기 구조 변화가 동시에 진행되는 양상입니다.`
          : `관련 뉴스가 충분하지 않아 정성적 판단에 한계가 있습니다.`)
    ).trim(),
    marketContext: String(
      r.marketContext ||
        r.industryContext ||
        `${keyword} 분야는 거시경제·규제·기술 혁신의 교차점에서 변동성과 기회가 공존하는 국면입니다.`
    ).trim(),
    keyTrends: keyTrends.length
      ? keyTrends
      : keyPoints.slice(0, 4).map((p) => ({ title: p.slice(0, 40), description: p, impact: 'medium' })),
    keyPoints: keyPoints.length ? keyPoints : fallbackPoints,
    stakeholderImpact: normalizeStakeholderImpact(r.stakeholderImpact),
    riskFactors: normalizeStringList(r.riskFactors || r.risks),
    opportunities: normalizeStringList(r.opportunities),
    strategicImplications: String(
      r.strategicImplications ||
        r.implications ||
        `${keyword} 이슈는 단순 뉴스 이벤트를 넘어 조직의 투자·운영·커뮤니케이션 전략 재점검을 요구할 수 있습니다.`
    ).trim(),
    recommendedActions: normalizeRecommendedActions(r.recommendedActions || r.recommendations),
    timeline: normalizeTimeline(r.timeline),
    outlook: String(
      r.outlook ||
        r.forecast ||
        `향후 1~2주간 ${keyword} 관련 추가 보도와 정책·기업 대응 발표가 이어질 가능성이 있습니다.`
    ).trim(),
    sources: normalizeSources(r.sources, articles),
  };
}

function buildConsultingDemoReport(keyword) {
  return {
    headline: `[데모] ${keyword} — 최근 7일 전략 이슈 브리핑`,
    executiveSummary: `"${keyword}"는 최근 7일간 정책, 시장, 글로벌 공급망 측면에서 동시에 부각된 키워드입니다. 국내외 언론 보도를 종합하면 단기적으로는 규제·투자 발표가, 중기적으로는 산업 재편과 경쟁 구도 변화가 핵심 변수로 작용하고 있습니다. 경영진·전략 기획 관점에서는 이벤트 대응과 구조적 기회 포착을 병행하는 접근이 필요합니다.`,
    overview: `본 보고서는 ${keyword} 관련 최근 7일 뉴스를 컨설팅 브리핑 형식으로 재구성한 데모입니다. 실제 Gemini 연동 시 동일 구조로 실시간 분석 결과가 생성됩니다.`,
    marketContext: `${keyword} 시장은 거시경제 불확실성, 기술 전환, 지정학적 리스크가 겹치는 가운데 성장과 변동성이 공존하는 국면에 있습니다. 투자자와 기업은 단기 실적보다 중장기 포지셔닝을 더욱 중시하는 경향이 강화되고 있습니다.`,
    keyTrends: [
      {
        title: '정책·규제 모멘텀 강화',
        description: '정부 및 규제기관의 발표가 업계 전반의 투자·운영 의사결정에 직접적인 영향을 미치고 있습니다.',
        impact: 'high',
      },
      {
        title: '글로벌 공급망 재편',
        description: '해외 기업·국가 간 협력·경쟁 구도 변화가 국내 시장 심리에 반영되고 있습니다.',
        impact: 'high',
      },
      {
        title: '투자·M&A 관심 확대',
        description: '성장 섹터 중심으로 자본 유입과 협력 논의가 활발해지고 있습니다.',
        impact: 'medium',
      },
    ],
    keyPoints: [
      `${keyword} 관련 정책·규제 논의가 단기 핵심 변수로 부상`,
      '국내외 주요 기업의 전략적 대응 및 투자 발표 증가',
      '시장 전망은 낙관·신중론이 혼재하나 구조적 성장 기대는 유지',
    ],
    stakeholderImpact: [
      { group: '정부·규제기관', impact: '정책 일관성과 실행력에 대한 시장의 민감도가 높아짐' },
      { group: '주요 기업', impact: '비용 구조·공급망·R&D 우선순위 재조정 압력 증가' },
      { group: '투자자', impact: '단기 변동성 대비 중장기 성장 스토리에 대한 선별적 접근' },
    ],
    riskFactors: [
      '정책 불확실성 및 실행 지연 가능성',
      '글로벌 경기 둔화에 따른 수요 변동',
      '환율·금리 등 거시 변수의 파급 효과',
    ],
    opportunities: [
      '정부 지원·인센티브를 활용한 선제적 투자',
      '글로벌 파트너십 및 기술 협력 확대',
      '신규 수요처 발굴 및 제품·서비스 차별화',
    ],
    strategicImplications: `${keyword} 이슈는 단발성 뉴스가 아닌 산업 구조 변화의 신호로 해석될 여지가 큽니다. 조직은 외부 환경 모니터링 체계, 시나리오 기반 의사결정, 이해관계자 커뮤니케이션 강화를 통해 불확실성을 관리해야 합니다.`,
    recommendedActions: [
      {
        horizon: '단기',
        action: '최근 7일 핵심 이슈 대시보드 구축 및 임원 브리핑',
        rationale: '의사결정 지연을 줄이고 대외 커뮤니케이션 메시지를 정렬하기 위함',
      },
      {
        horizon: '단기',
        action: '규제·정책 변화에 대한 영향도 점검 워크숍 실시',
        rationale: '준법·재무·운영 리스크를 조기에 식별',
      },
      {
        horizon: '중기',
        action: '성장 시나리오별 투자·인력·파트너십 로드맵 수립',
        rationale: '구조적 기회를 선점하고 자원 배분의 우선순위를 명확히 하기 위함',
      },
    ],
    timeline: [],
    outlook: `향후 1~2주간 ${keyword} 관련 추가 정책 발표, 기업 실적·가이던스, 글로벌 동향 보도가 이어질 가능성이 높습니다. 특히 주말 전후 정치·경제 일정과 연계된 뉴스 플로우에 주목할 필요가 있습니다.`,
    sources: [],
  };
}

function formatDateLabel(iso) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Asia/Seoul',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function impactLabel(impact) {
  const map = { high: '높음', medium: '중간', low: '낮음' };
  return map[String(impact).toLowerCase()] || '중간';
}

function renderSection(title, bodyHtml) {
  if (!bodyHtml) return '';
  return `
    <section class="report-section">
      <h4 class="report-section-title">${escapeHtml(title)}</h4>
      ${bodyHtml}
    </section>`;
}

function buildReportHtml({ keyword, searchedAt, articles, report }) {
  const r = report || {};
  const trendsHtml = (r.keyTrends || [])
    .map(
      (t) => `
      <div class="report-trend">
        <strong>${escapeHtml(t.title)}</strong>
        <span class="report-impact report-impact--${escapeHtml(t.impact)}">영향도 ${escapeHtml(impactLabel(t.impact))}</span>
        <p>${escapeHtml(t.description)}</p>
      </div>`
    )
    .join('');

  const stakeholderHtml = (r.stakeholderImpact || [])
    .map((s) => `<li><strong>${escapeHtml(s.group)}:</strong> ${escapeHtml(s.impact)}</li>`)
    .join('');

  const actionsHtml = (r.recommendedActions || [])
    .map(
      (a) => `
      <li>
        <span class="report-tag">${escapeHtml(a.horizon)}</span>
        <strong>${escapeHtml(a.action)}</strong>
        ${a.rationale ? `<br><span class="report-muted">${escapeHtml(a.rationale)}</span>` : ''}
      </li>`
    )
    .join('');

  const timelineHtml = (r.timeline || [])
    .map((t) => `<li>${t.date ? `<strong>${escapeHtml(t.date)}</strong> · ` : ''}${escapeHtml(t.event)}</li>`)
    .join('');

  const articleBlocks = (articles || [])
    .map(
      (a) => `
      <div class="report-article">
        <h5>${escapeHtml(a.title)}</h5>
        <p>${escapeHtml(a.summary)}</p>
        <p class="report-muted">${escapeHtml(a.source)} · ${escapeHtml(a.publishedAt)} · <a href="${escapeHtml(a.url)}">원문</a></p>
      </div>`
    )
    .join('');

  const sourceLinks = (r.sources || [])
    .map((s) => `<li><a href="${escapeHtml(s.url)}">${escapeHtml(s.name)}</a></li>`)
    .join('');

  const list = (items) => (items?.length ? `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>` : '');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Noto Sans KR', sans-serif; color: #111827; max-width: 760px; margin: 0 auto; padding: 28px; line-height: 1.65; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 18px; margin-top: 28px; }
    .meta { color: #6b7280; font-size: 13px; }
    .report-section { margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
    .report-section-title { margin: 0 0 8px; font-size: 14px; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.04em; }
    .report-trend { margin-bottom: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; }
    .report-impact { font-size: 11px; margin-left: 8px; padding: 2px 8px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; }
    .report-tag { display: inline-block; font-size: 11px; background: #111827; color: #fff; padding: 2px 8px; border-radius: 4px; margin-right: 6px; }
    .report-muted { color: #6b7280; font-size: 13px; }
    .report-article { margin-bottom: 12px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; }
    ul { padding-left: 18px; }
  </style>
</head>
<body>
  <h1>News_AI 전략 이슈 보고서</h1>
  <p class="meta">키워드: <strong>${escapeHtml(keyword)}</strong><br>검색 시점: ${escapeHtml(formatDateLabel(searchedAt))} · 최근 7일 기준</p>
  <h2>${escapeHtml(r.headline || `${keyword} 이슈 보고서`)}</h2>
  ${renderSection('핵심 요약', `<p>${escapeHtml(r.executiveSummary || '')}</p>`)}
  ${renderSection('현황 개요', `<p>${escapeHtml(r.overview || '')}</p>`)}
  ${renderSection('시장·산업 환경', `<p>${escapeHtml(r.marketContext || '')}</p>`)}
  ${renderSection('주요 트렌드', trendsHtml)}
  ${renderSection('핵심 시사점', list(r.keyPoints))}
  ${renderSection('이해관계자 영향', stakeholderHtml ? `<ul>${stakeholderHtml}</ul>` : '')}
  ${renderSection('리스크 요인', list(r.riskFactors))}
  ${renderSection('기회 요인', list(r.opportunities))}
  ${renderSection('전략적 함의', `<p>${escapeHtml(r.strategicImplications || '')}</p>`)}
  ${renderSection('권고 조치', actionsHtml ? `<ul>${actionsHtml}</ul>` : '')}
  ${renderSection('주요 일정', timelineHtml ? `<ul>${timelineHtml}</ul>` : '')}
  ${renderSection('향후 1~2주 전망', `<p>${escapeHtml(r.outlook || '')}</p>`)}
  ${renderSection('관련 뉴스', articleBlocks || '<p>관련 기사 없음</p>')}
  ${renderSection('출처', sourceLinks ? `<ul>${sourceLinks}</ul>` : '')}
  <p class="report-muted" style="margin-top:32px;">본 메일은 News_AI에서 자동 생성·발송되었습니다.</p>
</body>
</html>`;
}

function buildReportText({ keyword, searchedAt, report }) {
  const r = report || {};
  const lines = [
    `[News_AI] ${keyword} 전략 이슈 보고서`,
    `검색 시점: ${formatDateLabel(searchedAt)}`,
    '',
    r.headline,
    '',
    '핵심 요약',
    r.executiveSummary,
    '',
    '현황 개요',
    r.overview,
    '',
    '시장·산업 환경',
    r.marketContext,
    '',
    '전략적 함의',
    r.strategicImplications,
    '',
    '향후 전망',
    r.outlook,
  ];
  return lines.filter(Boolean).join('\n');
}

module.exports = {
  normalizeReport,
  buildConsultingDemoReport,
  buildReportHtml,
  buildReportText,
  escapeHtml,
  impactLabel,
};
