// /js/api.js
import { state } from './state.js';

let API_BASE_URL = 'http://127.0.0.1:8000';
try {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
    API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  }
} catch (_) {}
if (typeof window !== 'undefined' && window.API_BASE_URL) {
  API_BASE_URL = window.API_BASE_URL;
}
console.debug('[Config] API_BASE_URL =', API_BASE_URL);

export async function fetchAPI(endpoint, options = {}) {
  const isFormBody =
    options.body instanceof URLSearchParams || options.body instanceof FormData;

  const headers = isFormBody ? {} : { 'Content-Type': 'application/json' };
  options.headers = { ...headers, ...options.headers };
  options.credentials = 'include';
  if (state.jwt) options.headers['Authorization'] = `Bearer ${state.jwt}`;

  const url = `${API_BASE_URL}${endpoint}`;
  console.debug('[API] ->', options.method || 'GET', url);

  const resp = await fetch(url, options).catch((e) => {
    console.error('Network error:', e);
    throw e;
  });
  console.debug('[API] <-', resp.status, url);

  if (!resp.ok) {
    let data;
    try { data = await resp.json(); } catch { data = { message: resp.statusText }; }
    const err = new Error(data.message || `HTTP ${resp.status}`);
    err.response = resp;
    err.data = data;
    throw err;
  }
  return resp.status === 204 ? null : resp.json();
}

export const endpoints = {
  subjects(studentId) { return `/subjects/students/${studentId}/subjects`; },
  topicsForSubject(studentId, subjectId) { return `/topics/students/${studentId}/subjects/${subjectId}/topics`; },
  flashcardsList(studentId, topicId) { return `/flashcards/students/${studentId}/topics/${topicId}/flashcards`; },
  flashcardsGenerate(studentId, topicId) { return `/flashcards/students/${studentId}/topics/${topicId}/flashcards:generate`; },
  flashcardsGenerateMedia(studentId, topicId) { return `/flashcards/students/${studentId}/topics/${topicId}/flashcards:generate-media`; },
  // Some backends expose a topic-only list route
  flashcardsListByTopic(topicId) { return `/flashcards/topics/${topicId}/flashcards`; },
  flashcardsDeleteByTopic(topicId, cardId) { return `/flashcards/topics/${topicId}/flashcards/${cardId}`; },
};
