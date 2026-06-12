const BASE = '';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `요청 실패 (${res.status})`);
  }
  return data;
}

export const api = {
  getStatus: () => request('/api/status'),
  getTrending: () => request('/api/trending'),
  searchNews: (keyword) =>
    request('/api/search', {
      method: 'POST',
      body: JSON.stringify({ keyword }),
    }),
  sendReport: (payload) =>
    request('/api/send-email', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
