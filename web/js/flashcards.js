// /js/flashcards.js
import { state, selectTopic } from './state.js';
import { fetchAPI, endpoints } from './api.js';

const $ = (id) => document.getElementById(id);

// Keep pending images for current generation session
let pendingImages = [];

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
  const imageInput = $('imageInput');
  const dropZone = $('imageDropZone');
  const previewList = $('imagePreviewList');
  if (input) input.value = '';
  if (countInput && !countInput.value) countInput.value = '10';
  if (errBox) errBox.textContent = '';
  // Clear any previously displayed cards so we only show for current topic
  if (genHost) genHost.innerHTML = '';
  if (savedHost) savedHost.innerHTML = '';
  if (savedSection) savedSection.style.display = 'none';
  // Reset media inputs
  pendingImages = [];
  if (imageInput) imageInput.value = '';
  if (previewList) previewList.innerHTML = '';
  if (dropZone) {
    dropZone.classList.remove('dragover');
    // Bind once
    if (!dropZone.dataset.bound) {
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
      dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); handleFiles(e.dataTransfer?.files); });
      dropZone.dataset.bound = '1';
    }
  }
  if (imageInput && !imageInput.dataset.bound) {
    imageInput.addEventListener('change', (e) => handleFiles(e.currentTarget.files));
    imageInput.dataset.bound = '1';
  }
  // Paste support on textarea
  if (input && !input.dataset.pasteBound) {
    input.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.kind === 'file' && it.type.startsWith('image/')) {
          const f = it.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) handleFiles(files);
    });
    input.dataset.pasteBound = '1';
  }

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

    // Always call the media endpoint using FormData so images can be sent
    const fd = new FormData();
    // Call exactly per API spec: topicArea, count, image (multipart/form-data)
    fd.set('topicArea', topicArea);
    fd.set('count', String(count));
    // The API expects a single file field named 'image'
    if (pendingImages && pendingImages.length > 0) {
      const f = pendingImages[0];
      fd.append('image', f, f.name || 'image.png');
    }

    const res = await fetchAPI(
      endpoints.flashcardsGenerateMedia(state.studentId, state.selectedTopic.id),
      { method: 'POST', body: fd }
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
    // Prefer topic-only route first to avoid 404s on some backends
    try {
      res = await fetchAPI(
        endpoints.flashcardsListByTopic(state.selectedTopic.id)
      );
    } catch (eTopicOnly) {
      // Fallback to student-scoped route
      res = await fetchAPI(
        endpoints.flashcardsList(state.studentId, state.selectedTopic.id)
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

// Helpers
function handleFiles(fileList) {
  if (!fileList || !fileList.length) return;
  const previewList = $('imagePreviewList');
  const max = 12; // avoid huge lists
  for (let i = 0; i < fileList.length && pendingImages.length < max; i++) {
    const f = fileList[i];
    if (!f || !f.type?.startsWith('image/')) continue;
    pendingImages.push(f);
    if (previewList) {
      const img = document.createElement('img');
      img.alt = 'preview';
      img.src = URL.createObjectURL(f);
      previewList.appendChild(img);
    }
  }
}
