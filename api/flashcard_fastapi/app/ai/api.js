// inside fetchAPI, after if (!resp.ok)
let data;
try { data = await resp.json(); } catch { data = { message: resp.statusText }; }
const err = new Error(data.message || data.detail || `HTTP ${resp.status}`);
err.response = resp;
err.data = data;
throw err;
// js/api.js
let API_BASE_URL = 'http://127.0.0.1:8000';
const API_PREFIX = '/api';              // ← set '' if you don’t have a global API prefix

export const endpoints = {
  subjects(studentId) {
    return `${API_PREFIX}/subjects/students/${studentId}/subjects`;
  },
  topicsForSubject(studentId, subjectId) {
    return `${API_PREFIX}/topics/students/${studentId}/subjects/${subjectId}/topics`;
  },
};
