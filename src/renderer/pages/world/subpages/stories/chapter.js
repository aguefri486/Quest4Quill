const STORAGE_KEY_WORLDS = 'quest4quill_worlds';

const chapterTitle = document.getElementById('chapterTitle');
const chapterDescription = document.getElementById('chapterDescription');
const chapterMeta = document.getElementById('chapterMeta');
const chapterEditor = document.getElementById('chapterEditor');
const backToStoriesButton = document.getElementById('backToStoriesButton');
const deleteChapterModal = document.getElementById('deleteChapterModal');
const deleteChapterModalBody = document.getElementById('deleteChapterModalBody');
const deleteChapterModalCancel = document.getElementById('deleteChapterModalCancel');
const deleteChapterModalConfirm = document.getElementById('deleteChapterModalConfirm');

let worlds = [];
let pendingDeleteChapter = null;

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

function getParams() {
  return new URLSearchParams(window.location.search);
}

function getWorld() {
  const worldId = getParams().get('worldId');
  return worlds.find((world) => world.id === worldId) || null;
}

function getStory(world) {
  const storyId = getParams().get('storyId');
  return world?.stories?.find((story) => story.id === storyId) || null;
}

function getChapter(story) {
  const chapterId = getParams().get('chapterId');
  return story?.chapters?.find((chapter) => chapter.id === chapterId) || null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function closeDeleteChapterModal() {
  pendingDeleteChapter = null;
  deleteChapterModal?.classList.add('hidden');
  deleteChapterModal?.setAttribute('aria-hidden', 'true');
}

function confirmDeleteChapter() {
  if (!pendingDeleteChapter) return;

  const { world, story, chapter } = pendingDeleteChapter;
  story.chapters = (story.chapters || []).filter((item) => item.id !== chapter.id);
  story.updatedAt = Date.now();
  world.updatedAt = story.updatedAt;
  saveWorlds();
  closeDeleteChapterModal();
  window.location.href = `index.html?worldId=${encodeURIComponent(getParams().get('worldId') || '')}&storyId=${encodeURIComponent(story.id)}`;
}

function render() {
  const world = getWorld();
  const story = getStory(world);
  const chapter = getChapter(story);

  if (!world || !story || !chapter) {
    window.location.href = `index.html?worldId=${encodeURIComponent(getParams().get('worldId') || '')}`;
    return;
  }

  if (chapterTitle) chapterTitle.textContent = chapter.title;
  if (chapterDescription) chapterDescription.textContent = `Edita el resumen y el texto largo de ${chapter.title}.`;

  if (chapterMeta) {
    chapterMeta.innerHTML = `
      <span>${escapeHtml(story.title)}</span>
    `;
  }

  if (chapterEditor) {
    chapterEditor.innerHTML = `
      <div class="field">
        <label for="chapterNameInput">Nombre del capítulo</label>
        <input id="chapterNameInput" type="text" value="${escapeHtml(chapter.title)}" />
      </div>
      <div class="field">
        <label for="chapterSummaryInput">Resumen</label>
        <textarea id="chapterSummaryInput" rows="4">${escapeHtml(chapter.summary || '')}</textarea>
      </div>
      <div class="field">
        <label for="chapterContentInput">Texto del capítulo</label>
        <textarea id="chapterContentInput" rows="16">${escapeHtml(chapter.content || '')}</textarea>
      </div>
      <div class="chapter-actions">
        <button id="deleteChapterButton" class="danger-button" type="button">Eliminar capítulo</button>
      </div>
    `;
  }

  document.getElementById('chapterNameInput')?.addEventListener('input', (event) => {
    chapter.title = event.target.value.trim() || 'Capítulo';
    chapter.updatedAt = Date.now();
    story.updatedAt = chapter.updatedAt;
    world.updatedAt = chapter.updatedAt;
    saveWorlds();
    if (chapterTitle) chapterTitle.textContent = chapter.title;
    if (chapterDescription) chapterDescription.textContent = `Edita el resumen y el texto largo de ${chapter.title}.`;
  });

  document.getElementById('chapterSummaryInput')?.addEventListener('input', (event) => {
    chapter.summary = event.target.value;
    chapter.updatedAt = Date.now();
    story.updatedAt = chapter.updatedAt;
    world.updatedAt = chapter.updatedAt;
    saveWorlds();
  });

  document.getElementById('chapterContentInput')?.addEventListener('input', (event) => {
    chapter.content = event.target.value;
    chapter.updatedAt = Date.now();
    story.updatedAt = chapter.updatedAt;
    world.updatedAt = chapter.updatedAt;
    saveWorlds();
  });

  document.getElementById('deleteChapterButton')?.addEventListener('click', () => {
    pendingDeleteChapter = { world, story, chapter };
    if (deleteChapterModalBody) {
      deleteChapterModalBody.textContent = `¿Seguro que quieres eliminar "${chapter.title}"? Esta acción no se puede deshacer.`;
    }
    deleteChapterModal?.classList.remove('hidden');
    deleteChapterModal?.setAttribute('aria-hidden', 'false');
  });
}

window.addEventListener('DOMContentLoaded', () => {
  loadWorlds();
  deleteChapterModalCancel?.addEventListener('click', closeDeleteChapterModal);
  deleteChapterModalConfirm?.addEventListener('click', confirmDeleteChapter);
  deleteChapterModal?.addEventListener('click', (event) => {
    if (event.target === deleteChapterModal) {
      closeDeleteChapterModal();
    }
  });
  backToStoriesButton?.addEventListener('click', () => {
    const params = getParams();
    window.location.href = `index.html?worldId=${encodeURIComponent(params.get('worldId') || '')}&storyId=${encodeURIComponent(params.get('storyId') || '')}`;
  });
  render();
});
