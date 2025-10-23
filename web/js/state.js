// /js/state.js
export const state = {
  jwt: null,
  user: null,
  studentId: null,
  subjects: [],
  selectedSubject: null,
  topics: [],
  selectedTopic: null,
};

export function setAuth({ jwt, user, studentId }) {
  if (jwt !== undefined) state.jwt = jwt;
  if (user !== undefined) state.user = user;
  if (studentId !== undefined) state.studentId = studentId;
}

export function clearAuth() {
  state.jwt = null;
  state.user = null;
  state.studentId = null;
}

export function setSubjects(list) { state.subjects = Array.isArray(list) ? list : []; }
export function selectSubject(subj) { state.selectedSubject = subj || null; }
export function setTopics(list) { state.topics = Array.isArray(list) ? list : []; }
export function selectTopic(topic) { state.selectedTopic = topic || null; }
