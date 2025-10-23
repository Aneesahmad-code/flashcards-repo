// /js/flashcards.js
import { state, selectTopic } from './state.js';
import { fetchAPI, endpoints } from './api.js';

const $ = (id) => document.getElementById(id);

export function showFlashcardsForTopic(topic) {
  selectTopic(topic);

  const section = $('flashcardSection');
  if (!section) {
    console.warn('[Flashcards] #flashcardSection not found.');
    return;
  }

  // Show section and set headings
  section.style.display = 'block';
  const subjSpan = $('selectedSubjectDisplayForFlashcards');
  const topicSpan = $('selectedTopicDisplayForFlashcards');
  const savedTopicSpan = $('selectedTopicDisplayForSaved');
  if (subjSpan) subjSpan.textContent = state.selectedSubject?.title || '';
  if (topicSpan) topicSpan.textContent = state.selectedTopic?.title || '';
  if (savedTopicSpan) savedTopicSpan.textContent = state.selectedTopic?.title || '';

  // Clear generator UI and errors
  const input = $('topicInput');
  const countInput = $('countInput');
  const errBox = $('errorMessage');
  const genHost = $('flashcardsContainer');
  const savedHost = $('savedFlashcardsContainer');
  const savedSection = $('savedFlashcardsSection');
  if (input) input.value = '';
  if (countInput && !countInput.value) countInput.value = '10';
  if (errBox) errBox.textContent = '';
  // Clear any previously displayed cards so we only show for current topic
  if (genHost) genHost.innerHTML = '';
  if (savedHost) savedHost.innerHTML = '';
  if (savedSection) savedSection.style.display = 'none';

  // Bind form submit (once)
  const form = $('generateFlashcardsForm');
  if (form && !form.dataset.bound) {
    form.addEventListener('submit', onGenerate);
    form.dataset.bound = '1';
  }

  // Load saved flashcards for this topic
  loadSavedFlashcards();
}

async function onGenerate(e) {
  e.preventDefault();
  const errBox = $('errorMessage');
  const genBtn = $('generateButton');
  try {
    if (!state.studentId || !state.selectedTopic?.id) {
      if (errBox) errBox.textContent = 'Missing student or topic. Please reselect.';
      return;
    }
    const topicArea = ($('topicInput')?.value || state.selectedTopic.title || '').trim();
    const countVal = parseInt(($('countInput')?.value || '10').trim(), 10);
    const count = Number.isFinite(countVal) && countVal > 0 ? countVal : 10;

    if (!topicArea) {
      if (errBox) errBox.textContent = 'Please provide topic details or keep the topic title.';
      return;
    }

    if (genBtn) genBtn.disabled = true;
    if (errBox) errBox.textContent = '';

    const payload = { topicArea, count };
    const res = await fetchAPI(
      endpoints.flashcardsGenerate(state.studentId, state.selectedTopic.id),
      { method: 'POST', body: JSON.stringify(payload) }
    );

    // If API returns generated items, render them immediately
    if (res && (Array.isArray(res) || Array.isArray(res?.items))) {
      const items = Array.isArray(res) ? res : res.items;
      renderFlashcards(items, $('flashcardsContainer'));
    }

    // Refresh saved list from DB (source of truth)
    await loadSavedFlashcards();
  } catch (err) {
    console.error('Generate failed:', err);
    if (errBox) errBox.textContent = err.data?.message || 'Failed to generate flashcards.';
  } finally {
    if (genBtn) genBtn.disabled = false;
  }
}

async function loadSavedFlashcards() {
  const savedSection = $('savedFlashcardsSection');
  const savedHost = $('savedFlashcardsContainer');
  if (!savedHost) return;
  try {
    let res;
    // Try student-scoped list first
    try {
      res = await fetchAPI(
        endpoints.flashcardsList(state.studentId, state.selectedTopic.id)
      );
    } catch (e1) {
      // Fallback to topic-only route
      res = await fetchAPI(
        endpoints.flashcardsListByTopic(state.selectedTopic.id)
      );
    }
    const items = Array.isArray(res) ? res : (res?.items || []);
    renderFlashcards(items, savedHost);
    if (savedSection) savedSection.style.display = items.length ? 'block' : 'none';
  } catch (err) {
    console.error('Load saved flashcards failed:', err);
    if (savedSection) savedSection.style.display = 'none';
  }
}

function renderFlashcards(list, host) {
  if (!host) return;
  host.innerHTML = '';
  if (!Array.isArray(list) || list.length === 0) return;

  list.forEach((item) => host.appendChild(buildCard(item)));
}

function parseTermDef(item) {
  // Prefer structured fields
  let term = item.term || item.question || item.front || item.prompt;
  let def = item.definition || item.answer || item.back || item.response;

  // If only a single 'value' field exists like "Term: Definition"
  if ((!term || !def) && typeof item.value === 'string') {
    const idx = item.value.indexOf(':');
    if (idx !== -1) {
      const t = item.value.slice(0, idx).trim();
      const d = item.value.slice(idx + 1).trim();
      if (!term) term = t;
      if (!def) def = d;
    } else {
      // No colon found; use whole as term
      if (!term) term = item.value.trim();
    }
  }

  return {
    term: (term && String(term).trim()) || 'Term',
    def: (def && String(def).trim()) || 'Definition',
  };
}

function buildCard(item) {
  const { term: front, def: back } = parseTermDef(item);

  const card = document.createElement('div');
  card.className = 'flashcard';

  const inner = document.createElement('div');
  inner.className = 'flashcard-inner';

  const frontEl = document.createElement('div');
  frontEl.className = 'flashcard-front';
  const frontText = document.createElement('div');
  frontText.className = 'term';
  frontText.textContent = front;
  frontEl.appendChild(frontText);

  const backEl = document.createElement('div');
  backEl.className = 'flashcard-back';
  const backText = document.createElement('div');
  backText.className = 'definition';
  backText.textContent = back;
  backEl.appendChild(backText);

  inner.appendChild(frontEl);
  inner.appendChild(backEl);
  card.appendChild(inner);

  // Flip behavior
  card.addEventListener('click', () => {
    card.classList.toggle('flipped');
  });

  // Actions bar (delete only for saved cards that have an id)
  const actions = document.createElement('div');
  actions.className = 'flashcard-actions';
  if (item?.id) {
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'button-link delete-flashcard-btn';
    del.textContent = 'Delete';
    del.addEventListener('click', async (e) => {
      e.stopPropagation(); // avoid flip
      try {
        const topicId = state.selectedTopic?.id;
        if (!topicId) return;
        await fetchAPI(endpoints.flashcardsDeleteByTopic(topicId, item.id), { method: 'DELETE' });
        // Remove from DOM and refresh saved list
        card.remove();
        try { await loadSavedFlashcards(); } catch {}
      } catch (err) {
        const errBox = document.getElementById('errorMessage');
        if (errBox) errBox.textContent = err.data?.message || 'Failed to delete flashcard.';
      }
    });
    actions.appendChild(del);
  }
  card.appendChild(actions);

  return card;
}
