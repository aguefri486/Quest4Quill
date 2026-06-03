const STORAGE_KEY_WORLDS = 'quest4quill_worlds';

const worldTitle = document.getElementById('worldTitle');
const createNoteButton = document.getElementById('createNoteButton');
const notesGrid = document.getElementById('notesGrid');
const noteModal = document.getElementById('noteModal');
const noteModalClose = document.getElementById('noteModalClose');
const noteModalCloseSecondary = document.getElementById('noteModalCloseSecondary');
const deleteNoteButton = document.getElementById('deleteNoteButton');
const deleteNoteModal = document.getElementById('deleteNoteModal');
const deleteNoteModalBody = document.getElementById('deleteNoteModalBody');
const deleteNoteModalCancel = document.getElementById('deleteNoteModalCancel');
const deleteNoteModalConfirm = document.getElementById('deleteNoteModalConfirm');
const noteStorySelect = document.getElementById('noteStorySelect');
const noteInput = document.getElementById('noteInput');

let worlds = [];
let currentNoteId = null;
let notePendingDeleteId = null;

function loadWorlds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WORLDS);
    worlds = raw ? JSON.parse(raw) : [];
  } catch (error) {
    worlds = [];
  }
}

function saveWorlds() {
  localStorage.setItem(STORAGE_KEY_WORLDS, JSON.stringify(worlds));
}

function getWorldIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('worldId');
}

function getCurrentWorld() {
  const worldId = getWorldIdFromUrl();
  return worlds.find((world) => world.id === worldId) || null;
}

function getNotes(world) {
  if (!world) return [];
  if (!Array.isArray(world.notes)) world.notes = [];
  return world.notes;
}

function getStories(world) {
  if (!world) return [];
  if (!Array.isArray(world.stories)) world.stories = [];
  return world.stories;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeNotes(world) {
  const notes = getNotes(world);
  notes.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  notes.forEach((note, index) => {
    note.order = index + 1;
  });
}

function getStoryLabel(world, storyId) {
  if (!storyId) return 'Sin historia';
  const story = getStories(world).find((item) => item.id === storyId);
  return story ? story.title : 'Historia eliminada';
}

function getNoteTitle(note) {
  const content = String(note?.content || '').trim();
  if (!content) return 'Nota sin contenido';
  return content.split(/\r?\n/)[0].slice(0, 80);
}

function getNextNoteOrder(world) {
  return getNotes(world).reduce((highest, note) => Math.max(highest, Number(note.order) || 0), 0) + 1;
}

function createNote() {
  const world = getCurrentWorld();
  if (!world) return;

  const now = Date.now();
  const note = {
    id: `note-${now}`,
    content: '',
    storyId: null,
    order: getNextNoteOrder(world),
    createdAt: now,
    updatedAt: now
  };

  getNotes(world).push(note);
  world.updatedAt = now;
  saveWorlds();
  currentNoteId = note.id;
  renderNotes();
  openNoteModal(note.id);
}

function getSelectedNote(world) {
  const notes = getNotes(world);
  if (notes.length === 0) return null;
  return notes.find((note) => note.id === currentNoteId) || notes[notes.length - 1];
}

function openNoteModal(noteId) {
  currentNoteId = noteId;
  const world = getCurrentWorld();
  if (!world) return;

  const note = getNotes(world).find((item) => item.id === noteId);
  if (!note) return;

  if (noteStorySelect) {
    noteStorySelect.innerHTML = [
      '<option value="">Sin historia</option>',
      ...getStories(world).map(
        (story) => `<option value="${story.id}">${escapeHtml(story.title)}</option>`
      )
    ].join('');
    noteStorySelect.value = note.storyId || '';
  }
  noteInput.value = note.content || '';
  noteModal?.classList.remove('hidden');
  noteModal?.setAttribute('aria-hidden', 'false');
  setTimeout(() => noteInput?.focus(), 0);
}

function closeNoteModal() {
  noteModal?.classList.add('hidden');
  noteModal?.setAttribute('aria-hidden', 'true');
  currentNoteId = null;
}

function openDeleteNoteModal(note) {
  notePendingDeleteId = note.id;
  if (deleteNoteModalBody) {
    deleteNoteModalBody.textContent = `¿Seguro que quieres eliminar "${getNoteTitle(note)}"? Esta acción no se puede deshacer.`;
  }
  deleteNoteModal?.classList.remove('hidden');
  deleteNoteModal?.setAttribute('aria-hidden', 'false');
}

function closeDeleteNoteModal() {
  notePendingDeleteId = null;
  deleteNoteModal?.classList.add('hidden');
  deleteNoteModal?.setAttribute('aria-hidden', 'true');
}

function deleteNote(noteId) {
  const world = getCurrentWorld();
  if (!world) return;

  const notes = getNotes(world).filter((note) => note.id !== noteId);
  world.notes = notes;
  world.updatedAt = Date.now();
  saveWorlds();
  currentNoteId = notes[0]?.id || null;
  renderNotes();
}

function updateCurrentNote(content) {
  const world = getCurrentWorld();
  if (!world || !currentNoteId) return;

  const note = getNotes(world).find((item) => item.id === currentNoteId);
  if (!note) return;

  note.content = content;
  note.updatedAt = Date.now();
  world.updatedAt = note.updatedAt;
  saveWorlds();
  renderNotes();
}

function updateCurrentNoteStory(storyId) {
  const world = getCurrentWorld();
  if (!world || !currentNoteId) return;

  const note = getNotes(world).find((item) => item.id === currentNoteId);
  if (!note) return;

  note.storyId = storyId || null;
  note.updatedAt = Date.now();
  world.updatedAt = note.updatedAt;
  saveWorlds();
  renderNotes();
}

function getNoteSnippet(note) {
  const text = String(note.content || '').trim();
  if (!text) return 'Empieza a escribir aquí.';
  return text.slice(0, 180);
}

function renderNotes() {
  const world = getCurrentWorld();
  if (!world) {
    window.location.href = '../../../home/index.html';
    return;
  }

  if (!notesGrid) return;

  normalizeNotes(world);

  if (worldTitle) worldTitle.textContent = 'Notas';

  const notes = getNotes(world);
  notesGrid.innerHTML = notes.length
    ? notes
        .map((note) => {
          const isEmpty = !String(note.content || '').trim();
          const snippet = escapeHtml(getNoteSnippet(note));
          const storyLabel = escapeHtml(getStoryLabel(world, note.storyId));

          return `
            <button class="note-card" type="button" data-note-id="${note.id}">
              <div class="note-card-top">
                <span class="note-card-dot" aria-hidden="true"></span>
                <span class="note-card-tag">${storyLabel}</span>
              </div>
              <div class="${isEmpty ? 'note-card-empty' : 'note-card-snippet'}">${snippet}</div>
            </button>
          `;
        })
        .join('')
    : `
      <button class="note-card" type="button" data-note-id="__new__">
        <div class="note-card-top">
          <span class="note-card-dot" aria-hidden="true"></span>
          <span class="note-card-tag">Sin historia</span>
        </div>
        <div class="note-card-empty">Pulsa “Añadir nota” para crear tu primera nota rápida.</div>
      </button>
    `;

  notesGrid.querySelectorAll('[data-note-id]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.noteId === '__new__') {
        createNote();
        return;
      }
      openNoteModal(button.dataset.noteId);
    });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  loadWorlds();
  createNoteButton?.addEventListener('click', createNote);
  noteModalClose?.addEventListener('click', closeNoteModal);
  noteModalCloseSecondary?.addEventListener('click', closeNoteModal);
  deleteNoteButton?.addEventListener('click', () => {
    const world = getCurrentWorld();
    if (!world || !currentNoteId) return;

    const note = getNotes(world).find((item) => item.id === currentNoteId);
    if (!note) return;

    openDeleteNoteModal(note);
  });
  noteModal?.addEventListener('click', (event) => {
    if (event.target === noteModal) {
      closeNoteModal();
    }
  });
  deleteNoteModalCancel?.addEventListener('click', closeDeleteNoteModal);
  deleteNoteModalConfirm?.addEventListener('click', () => {
    if (!notePendingDeleteId) return;
    deleteNote(notePendingDeleteId);
    closeDeleteNoteModal();
    closeNoteModal();
  });
  deleteNoteModal?.addEventListener('click', (event) => {
    if (event.target === deleteNoteModal) {
      closeDeleteNoteModal();
    }
  });
  noteInput?.addEventListener('input', (event) => {
    updateCurrentNote(event.target.value);
  });
  noteStorySelect?.addEventListener('change', (event) => {
    updateCurrentNoteStory(event.target.value);
  });
  renderNotes();
});
