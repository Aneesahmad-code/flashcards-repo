// api.js
// Browser-side helper to construct API URLs and make requests.
// Automatically supports local dev and production deployments.

// Defaults
const DEFAULT_LOCAL_BASE = 'http://127.0.0.1:8000';
const DEFAULT_PROD_BASE = 'https://flashcards-fastapi.onrender.com';

// Compute a sensible default base depending on where the app runs
let computedBase = DEFAULT_LOCAL_BASE;
if (typeof window !== 'undefined') {
  const host = window.location.host || '';
  if (host.includes('onrender.com')) {
    computedBase = DEFAULT_PROD_BASE;
  }
  // Optional: override via ?api=... for quick manual testing
  try {
    const u = new URL(window.location.href);
    const override = u.searchParams.get('api');
    if (override) computedBase = override;
  } catch {}
}

// Final base URL resolution order (first match wins):
// - process.env.API_BASE_URL or VITE_API_BASE_URL (bundlers)
// - window.API_BASE_URL (global override)
// - computedBase (based on location)
export const API_BASE_URL = (
  (typeof process !== 'undefined' && process.env && (process.env.API_BASE_URL || process.env.VITE_API_BASE_URL)) ||
  (typeof window !== 'undefined' && window.API_BASE_URL) ||
  computedBase
);

// Most routes are mounted at the root in this API; keep overrideable.
export const API_PREFIX = (
  (typeof process !== 'undefined' && process.env && (process.env.API_PREFIX || process.env.VITE_API_PREFIX)) ||
  ''
);

function joinUrl(base, path) {
  if (!path) return base;
  if (/^https?:\/\//i.test(path)) return path; // already absolute
  if (base.endsWith('/') && path.startsWith('/')) return base + path.slice(1);
  if (!base.endsWith('/') && !path.startsWith('/')) return base + '/' + path;
  return base + path;
}

export async function fetchAPI(path, options = {}) {
  const url = joinUrl(API_BASE_URL, path);
  const headers = {
    accept: 'application/json',
    ...(options.body ? { 'content-type': 'application/json' } : {}),
    ...(options.headers || {}),
  };
  const resp = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });
  if (!resp.ok) {
    let data;
    try { data = await resp.json(); } catch { data = { message: resp.statusText }; }
    const err = new Error(data.detail || data.message || `HTTP ${resp.status}`);
    err.response = resp;
    err.data = data;
    throw err;
  }
  const ct = resp.headers.get('content-type') || '';
  return ct.includes('application/json') ? await resp.json() : await resp.text();
}

export const endpoints = {
  auth: {
    register: () => `${API_PREFIX}/auth/register`,
    login: () => `${API_PREFIX}/auth/login`,
  },
  subjects(studentId) {
    return `${API_PREFIX}/subjects/students/${studentId}/subjects`;
  },
  topicsForSubject(studentId, subjectId) {
    return `${API_PREFIX}/topics/students/${studentId}/subjects/${subjectId}/topics`;
  },
  flashcardsForTopic(topicId) {
    return `${API_PREFIX}/flashcards/topics/${topicId}/flashcards`;
  },
  deleteFlashcard(topicId, flashcardId) {
    return `${API_PREFIX}/flashcards/topics/${topicId}/flashcards/${flashcardId}`;
  },
};

