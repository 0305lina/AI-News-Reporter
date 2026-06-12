/** 클라이언트 폴백용 샘플 (서버 데모와 동일 구조) */

export function buildDemoSearchResult(keyword) {
  const searchedAt = new Date().toISOString();
  const today = searchedAt.slice(0, 10);
  const dayAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

  return {
    keyword,
    searchedAt,
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
    ],
    report: {
      headline: `[데모] ${keyword} 최근 7일 주요 이슈`,
      overview: `데모 데이터입니다. 서버 API 연결 실패 시 표시됩니다.`,
      keyPoints: [
        `${keyword} 관련 정책·규제 논의 확대`,
        `국내외 시장 전망 및 투자 동향 주목`,
      ],
      sources: [
        { name: '데모뉴스', url: 'https://example.com/news/1' },
      ],
    },
  };
}
