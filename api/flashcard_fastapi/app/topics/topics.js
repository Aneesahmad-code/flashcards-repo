// js/topics.js
import { state, setTopics } from './state.js';
import { fetchAPI, endpoints } from './api.js';

const $ = (id) => document.getElementById(id);

export function showTopicsForSubject(subject) {
  const section = $('topicManagementSection');
  const titleSpan = $('selectedSubjectForTopicsTitle')?.querySelector('span');
  const listHost = $('topicListContainer');
  const emptyMsg = $('noTopicsMessage');
  const errBox = $('topicErrorMessage');
  const createForm = $('createTopicForm');
  const titleInput = $('topicTitleInput');

  if (!section) {
    console.warn('[Topics] #topicManagementSection not found. Check HTML.');
    return;
  }

  section.style.display = 'block';
  if (titleSpan) titleSpan.textContent = subject.title || '(untitled)';

  if (listHost) listHost.innerHTML = '';
  if (emptyMsg) emptyMsg.style.display = 'none';
  if (errBox) errBox.textContent = '';
  if (titleInput) titleInput.value = '';

  if (createForm && !createForm.dataset.bound) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = (titleInput?.value || '').trim();
      if (!title) {
        if (errBox) errBox.textContent = 'Please enter a topic title.';
        return;
      }

      const activeSubjectId = state?.selectedSubject?.id; // ← read current selection
      if (!activeSubjectId) {
        if (errBox) errBox.textContent = 'No subject selected.';
        return;
      }

      try {
        console.log('[Topics] POST to', endpoints.topicsForSubject(state.studentId, activeSubjectId), { title });
        const created = await fetchAPI(
          endpoints.topicsForSubject(state.studentId, activeSubjectId),
          { method: 'POST', body: JSON.stringify({ title }) }
        );
        console.log('[Topics] Created:', created);

        if (Array.isArray(created)) {
          setTopics(created);
        } else {
          setTopics([...(state.topics || []), created]);
        }
        if (titleInput) titleInput.value = '';
        if (errBox) errBox.textContent = '';
        renderTopicsList();
      } catch (err) {
        const detail = err?.data?.detail || err?.data?.message || err?.message || 'Failed to create topic.';
        if (errBox) errBox.textContent = detail;
        console.error('[Topics] Create failed:', err);
      }
    });
    createForm.dataset.bound = '1';
  }

  loadTopics(subject);
}

async function loadTopics(subject) {
  const errBox = $('topicErrorMessage');
  try {
    console.log('[Topics] GET', endpoints.topicsForSubject(state.studentId, subject.id));
    const res = await fetchAPI(endpoints.topicsForSubject(state.studentId, subject.id));
    setTopics(Array.isArray(res) ? res : (res?.items || []));
    if (errBox) errBox.textContent = '';
    renderTopicsList();
  } catch (err) {
    const detail = err?.data?.detail || err?.data?.message || err?.message || 'Failed to load topics.';
    if (errBox) errBox.textContent = detail;
    console.error('[Topics] Load failed:', err);
    setTopics([]);
    renderTopicsList();
  }
}

function renderTopicsList() {
  const listHost = $('topicListContainer');
  const emptyMsg = $('noTopicsMessage');
  if (!listHost) return;

  listHost.innerHTML = '';
  if (!state.topics || state.topics.length === 0) {
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }
  if (emptyMsg) emptyMsg.style.display = 'none';

  const ul = document.createElement('ul');
  ul.className = 'topic-list';

  state.topics.forEach((t) => {
    const li = document.createElement('li');
    li.className = 'topic-item';

    const name = document.createElement('span');
    name.className = 'topic-name';
    name.textContent = t.title || '(untitled)';

    const actions = document.createElement('div');
    actions.className = 'topic-actions';
    // TODO: Open/Edit/Delete later

    li.appendChild(name);
    li.appendChild(actions);
    ul.appendChild(li);
  });

  listHost.appendChild(ul);
}
