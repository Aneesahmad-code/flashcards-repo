// js/api.js (local dev defaults)
// Resolve API base URL: prefer explicit override, else auto-detect prod vs local
const _LOCAL_BASE = 'http://127.0.0.1:8000';
const _PROD_BASE = 'https://flashcards-fastapi.onrender.com';

export const API_BASE_URL = (function () {
  // 1) Window override (set in index.html before bundle)
  if (typeof window !== 'undefined' && window.API_BASE_URL) {
    return window.API_BASE_URL;
  }
  // 2) Vite env at build time (preferred in prod builds)
  try {
    // import.meta.env is only available when bundled by Vite
    // eslint-disable-next-line no-undef
    if (typeof import !== 'undefined' && typeof import.meta !== 'undefined' && import.meta.env) {
      // eslint-disable-next-line no-undef
      const viteUrl = import.meta.env.VITE_API_BASE_URL;
      if (viteUrl) return viteUrl;
    }
  } catch {}
  // 3) process.env fallback (some bundlers inject these)
  try {
    if (typeof process !== 'undefined' && process.env) {
      const envUrl = process.env.VITE_API_BASE_URL || process.env.API_BASE_URL;
      if (envUrl) return envUrl;
    }
  } catch {}
  // 4) Auto-detect prod by hostname
  try {
    if (typeof window !== 'undefined' && String(window.location.hostname).includes('onrender.com')) {
      return _PROD_BASE;
    }
  } catch {}
  // 5) Fallback to local dev
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
