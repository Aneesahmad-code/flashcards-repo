// /js/topics.js
import { state, setTopics, selectTopic } from './state.js';
import { showFlashcardsForTopic } from './flashcards.js';
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

  // When switching subjects, clear any previously shown topic and flashcards
  try { selectTopic(null); } catch {}
  const flashSection = $('flashcardSection');
  const genHost = $('flashcardsContainer');
  const savedHost = $('savedFlashcardsContainer');
  const savedSection = $('savedFlashcardsSection');
  if (genHost) genHost.innerHTML = '';
  if (savedHost) savedHost.innerHTML = '';
  if (savedSection) savedSection.style.display = 'none';
  if (flashSection) flashSection.style.display = 'none';

  if (createForm && !createForm.dataset.bound) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = (titleInput?.value || '').trim();
      if (!title) {
        if (errBox) errBox.textContent = 'Please enter a topic title.';
        return;
      }
      try {
        const created = await fetchAPI(
          endpoints.topicsForSubject(state.studentId, subject.id),
          { method: 'POST', body: JSON.stringify({ title }) }
        );
        if (Array.isArray(created)) {
          setTopics(created);
        } else {
          // Ensure the created topic is associated locally to this subject
          const normalized = { ...created };
          if (normalized.subjectId == null && normalized.subject_id == null) {
            normalized.subjectId = subject.id;
          }
          setTopics([...(state.topics || []), normalized]);
        }
        if (titleInput) titleInput.value = '';
        if (errBox) errBox.textContent = '';
        renderTopicsList();
      } catch (err) {
        if (errBox) errBox.textContent = err.data?.message || 'Failed to create topic.';
      }
    });
    createForm.dataset.bound = '1';
  }

  loadTopics(subject);
}

async function loadTopics(subject) {
  const errBox = $('topicErrorMessage');
  try {
    const res = await fetchAPI(endpoints.topicsForSubject(state.studentId, subject.id));
    setTopics(Array.isArray(res) ? res : (res?.items || []));
    if (errBox) errBox.textContent = '';
    renderTopicsList();
  } catch (err) {
    console.error('Topics load failed:', err);
    if (errBox) errBox.textContent = err.data?.message || 'Failed to load topics.';
    setTopics([]);
    renderTopicsList();
  }
}

function renderTopicsList() {
  const listHost = $('topicListContainer');
  const emptyMsg = $('noTopicsMessage');
  if (!listHost) return;

  listHost.innerHTML = '';
  // Filter topics by the currently selected subject when possible
  const selectedId = state.selectedSubject?.id;
  const topicsForSubject = (state.topics || []).filter((t) => {
    if (!selectedId) return true;
    const direct = t.subjectId ?? t.subject_id;
    if (direct != null) return String(direct) === String(selectedId);
    const nested = t.subject?.id ?? t.subjectId ?? t.subject_id;
    if (nested != null) return String(nested) === String(selectedId);
    // If topic has no subject reference, optimistically include
    return true;
  });

  if (!topicsForSubject || topicsForSubject.length === 0) {
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }
  if (emptyMsg) emptyMsg.style.display = 'none';

  const ul = document.createElement('ul');
  ul.className = 'topic-list';

  topicsForSubject.forEach((t) => {
    const li = document.createElement('li');
    li.className = 'topic-item';

    const name = document.createElement('span');
    name.className = 'topic-name';
    name.textContent = t.title || '(untitled)';
    name.style.cursor = 'pointer';
    name.title = 'Open flashcards for this topic';
    name.addEventListener('click', (e) => {
      e.preventDefault();
      showFlashcardsForTopic(t);
    });

    const actions = document.createElement('div');
    actions.className = 'topic-actions';
    // TODO: add Open/Edit/Delete later

    li.appendChild(name);
    li.appendChild(actions);
    ul.appendChild(li);
  });

  listHost.appendChild(ul);
}
