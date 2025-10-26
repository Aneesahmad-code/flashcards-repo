// js/api.js (local dev defaults)
// Resolve API base URL: prefer explicit override, else auto-detect prod vs local
const _LOCAL_BASE = 'http://127.0.0.1:8000';
const _PROD_BASE = 'https://flashcards-fastapi.onrender.com';

export const API_BASE_URL = (function () {
  // 1) window.API_BASE_URL wins if set (lets you override without rebuild)
  if (typeof window !== 'undefined' && window.API_BASE_URL) {
    return window.API_BASE_URL;
  }
  // 2) If hosted on onrender.com (your prod frontend), use prod API
  try {
    if (typeof window !== 'undefined' && String(window.location.hostname).includes('onrender.com')) {
      return _PROD_BASE;
    }
  } catch {}
  // 3) Fallback to local dev
  return _LOCAL_BASE;
})();
export const API_PREFIX = '';

function joinUrl(base, path) {
  if (!path) return base;
  if (/^https?:\/\//i.test(path)) return path; // absolute already
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
  const resp = await fetch(url, { credentials: 'include', ...options, headers });
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
    register: () => `/auth/register`,
    login: () => `/auth/login`,
  },
  subjects(studentId) {
    return `/subjects/students/${studentId}/subjects`;
  },
  topicsForSubject(studentId, subjectId) {
    return `/topics/students/${studentId}/subjects/${subjectId}/topics`;
  },
};
