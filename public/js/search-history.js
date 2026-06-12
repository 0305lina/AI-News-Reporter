const STORAGE_KEY = 'news_ai_search_history';
const MAX_ITEMS = 15;

export const searchHistory = {
  load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  },

  save(keyword, meta = {}) {
    const trimmed = String(keyword || '').trim();
    if (!trimmed) return this.load();

    const entry = {
      keyword: trimmed,
      searchedAt: meta.searchedAt || new Date().toISOString(),
      articleCount: meta.articleCount ?? 0,
    };

    const next = [
      entry,
      ...this.load().filter((item) => item.keyword.toLowerCase() !== trimmed.toLowerCase()),
    ].slice(0, MAX_ITEMS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  },
};
