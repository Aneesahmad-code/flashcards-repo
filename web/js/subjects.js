// /js/subjects.js
import { state, setSubjects, selectSubject } from './state.js';
import { fetchAPI, endpoints } from './api.js';
import { showTopicsForSubject } from './topics.js';

const $ = (id) => document.getElementById(id);

export async function fetchAndRenderSubjects(subjectsCardEl) {
  if (!state.studentId) {
    setError('subjectErrorMessage', 'Missing student id. Please login again.');
    return;
  }
  try {
    const res = await fetchAPI(endpoints.subjects(state.studentId));
    setSubjects(Array.isArray(res) ? res : (res?.items || []));
    renderSubjectsList(subjectsCardEl);
    setError('subjectErrorMessage', '');
  } catch (err) {
    setError('subjectErrorMessage', err.data?.message || 'Failed to load subjects.');
  }

  const form = $('createSubjectForm');
  const input = $('subjectNameInput');
  if (form && !form.dataset.bound) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = (input?.value || '').trim();
      if (!title) return setError('subjectErrorMessage', 'Please enter a subject title.');
      try {
        const created = await fetchAPI(endpoints.subjects(state.studentId), {
          method: 'POST',
          body: JSON.stringify({ title }),
        });
        setSubjects([...state.subjects, created]);
        input.value = '';
        renderSubjectsList(subjectsCardEl);
        setError('subjectErrorMessage', '');
      } catch (err) {
        setError('subjectErrorMessage', err.data?.message || 'Failed to create subject.');
      }
    });
    form.dataset.bound = '1';
  }
}

function renderSubjectsList(subjectsCardEl) {
  const listHost = $('subjectListContainer');
  const empty = $('noSubjectsMessage');
  if (!listHost) return;

  listHost.innerHTML = '';
  if (!state.subjects.length) {
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  const ul = document.createElement('ul');
  ul.className = 'subject-list';

  state.subjects.forEach((subj) => {
    const li = document.createElement('li');
    li.className = 'subject-item';

    const name = document.createElement('span');
    name.className = 'subject-name';
    name.textContent = subj.title || '(untitled)';

    const actions = document.createElement('div');
    actions.className = 'subject-actions';

    const openBtn = document.createElement('button');
    openBtn.className = 'primary-button';
    openBtn.type = 'button';
    openBtn.textContent = 'Open';
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      selectSubject(subj);
      showTopicsForSubject(subj);
    });

    const editBtn = document.createElement('button');
    editBtn.className = 'secondary-button';
    editBtn.type = 'button';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', async () => {
      const next = prompt(`Rename "${subj.title}"`, subj.title);
      if (next && next.trim() && next.trim() !== subj.title) {
        try {
          const updated = await fetchAPI(`${endpoints.subjects(state.studentId)}/${subj.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ title: next.trim() }),
          });
          setSubjects(state.subjects.map(s => (s.id === subj.id ? updated : s)));
          renderSubjectsList(subjectsCardEl);
        } catch (err) {
          setError('subjectErrorMessage', err.data?.message || 'Failed to update subject.');
        }
      }
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'danger-button';
    delBtn.type = 'button';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async () => {
      try {
        await fetchAPI(`${endpoints.subjects(state.studentId)}/${subj.id}`, { method: 'DELETE' });
        setSubjects(state.subjects.filter(s => s.id !== subj.id));
        if (state.selectedSubject?.id === subj.id) {
          selectSubject(null);
          const topicsSection = document.getElementById('topicManagementSection');
          if (topicsSection) topicsSection.style.display = 'none';
        }
        renderSubjectsList(subjectsCardEl);
      } catch (err) {
        setError('subjectErrorMessage', err.data?.message || 'Failed to delete subject.');
      }
    });

    actions.appendChild(openBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(name);
    li.appendChild(actions);
    ul.appendChild(li);
  });

  listHost.appendChild(ul);
}

function setError(id, text) {
  const box = document.getElementById(id);
  if (box) box.textContent = text;
}
