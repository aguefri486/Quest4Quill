const STORAGE_KEY_WORLDS = 'quest4quill_worlds';

const worldTitle = document.getElementById('worldTitle');
const storyCount = document.getElementById('storyCount');
const storyCountCompact = document.getElementById('storyCountCompact');
const storiesList = document.getElementById('storiesList');
const compactStoriesList = document.getElementById('compactStoriesList');
const storyEditor = document.getElementById('storyEditor');
const createStoryButton = document.getElementById('createStoryButton');
const deleteStoryModal = document.getElementById('deleteStoryModal');
const deleteStoryModalBody = document.getElementById('deleteStoryModalBody');
const deleteStoryModalCancel = document.getElementById('deleteStoryModalCancel');
const deleteStoryModalConfirm = document.getElementById('deleteStoryModalConfirm');

let worlds = [];
let selectedStoryId = null;
let storyPendingDeleteId = null;

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

function getStories(world) {
  if (!world) return [];
  if (!Array.isArray(world.stories)) world.stories = [];
  return world.stories;
}

function getOrderValue(item) {
  return Number(item?.order) || 0;
}

function compareByOrder(a, b) {
  const orderDiff = getOrderValue(a) - getOrderValue(b);
  if (orderDiff !== 0) return orderDiff;

  const createdAtA = Number(a?.createdAt) || 0;
  const createdAtB = Number(b?.createdAt) || 0;
  return createdAtA - createdAtB;
}

function normalizeOrderedItems(items) {
  const ordered = items.some((item) => getOrderValue(item) > 0)
    ? items.slice().sort(compareByOrder)
    : items.slice();

  ordered.forEach((item, index) => {
    item.order = index + 1;
  });

  return ordered;
}

function normalizeWorldData(world) {
  let changed = false;

  if (!Array.isArray(world.stories)) {
    world.stories = [];
    changed = true;
  }

  const normalizedStories = normalizeOrderedItems(world.stories);
  const storiesChanged =
    normalizedStories.length !== world.stories.length ||
    normalizedStories.some((story, index) => story !== world.stories[index]);
  if (storiesChanged) {
    changed = true;
  }
  world.stories = normalizedStories;

  world.stories.forEach((story) => {
    if (!Array.isArray(story.chapters)) {
      story.chapters = [];
      changed = true;
    }

    const normalizedChapters = normalizeOrderedItems(story.chapters);
    const chaptersChanged =
      normalizedChapters.length !== story.chapters.length ||
      normalizedChapters.some((chapter, index) => chapter !== story.chapters[index]);
    if (chaptersChanged) {
      changed = true;
    }
    story.chapters = normalizedChapters;
  });

  return changed;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setUrlStoryId(storyId) {
  const url = new URL(window.location.href);
  if (storyId) {
    url.searchParams.set('storyId', storyId);
  } else {
    url.searchParams.delete('storyId');
  }
  window.history.replaceState({}, '', url);
}

function getSelectedStory(world) {
  const stories = getStories(world);
  if (stories.length === 0) return null;

  const fromState = stories.find((story) => story.id === selectedStoryId);
  if (fromState) return fromState;

  const fromQuery = new URLSearchParams(window.location.search).get('storyId');
  const fromUrl = stories.find((story) => story.id === fromQuery);
  if (fromUrl) {
    selectedStoryId = fromUrl.id;
    return fromUrl;
  }

  selectedStoryId = stories[0].id;
  return stories[0];
}

function getSelectedChapter(story) {
  if (!story || !Array.isArray(story.chapters) || story.chapters.length === 0) return null;

  const fromQuery = new URLSearchParams(window.location.search).get('chapterId');
  const selected = story.chapters.find((chapter) => chapter.id === fromQuery);
  return selected || story.chapters[0];
}

function getNextStoryOrder(world) {
  const stories = getStories(world);
  return stories.reduce((highest, story) => Math.max(highest, getOrderValue(story)), 0) + 1;
}

function getNextChapterOrder(story) {
  const chapters = Array.isArray(story.chapters) ? story.chapters : [];
  return chapters.reduce((highest, chapter) => Math.max(highest, getOrderValue(chapter)), 0) + 1;
}

function getChapterNumberFromTitle(title) {
  const match = String(title || '').match(/^Cap[ií]tulo\s+(\d+)\b/i);
  return match ? Number(match[1]) : null;
}

function getNextChapterTitle(story) {
  const numbers = (story.chapters || [])
    .map((chapter) => getChapterNumberFromTitle(chapter.title))
    .filter((number) => Number.isFinite(number));

  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `Capítulo ${nextNumber}`;
}

function createStory() {
  const world = getCurrentWorld();
  if (!world) return;

  normalizeWorldData(world);

  const stories = getStories(world);
  const now = Date.now();
  const story = {
    id: `story-${now}`,
    title: `Historia ${stories.length + 1}`,
    order: getNextStoryOrder(world),
    createdAt: now,
    updatedAt: now,
    chapters: [
      {
        id: `chapter-${now}`,
        title: 'Capítulo 1',
        summary: '',
        content: '',
        order: 1,
        createdAt: now,
        updatedAt: now
      }
    ]
  };

  stories.push(story);
  world.updatedAt = now;
  selectedStoryId = story.id;
  saveWorlds();
  setUrlStoryId(story.id);
  render();
  openChapter(story.id, story.chapters[0].id);
}

function createChapter(story) {
  const now = Date.now();
  const chapter = {
    id: `chapter-${now}`,
    title: getNextChapterTitle(story),
    summary: '',
    content: '',
    order: getNextChapterOrder(story),
    createdAt: now,
    updatedAt: now
  };

  story.chapters = Array.isArray(story.chapters) ? story.chapters : [];
  story.chapters.push(chapter);
  story.updatedAt = now;

  const world = getCurrentWorld();
  if (world) world.updatedAt = now;

  saveWorlds();
  openChapter(story.id, chapter.id);
}

function openChapter(storyId, chapterId) {
  const url = new URL('chapter.html', window.location.href);
  url.searchParams.set('worldId', getWorldIdFromUrl() || '');
  url.searchParams.set('storyId', storyId);
  url.searchParams.set('chapterId', chapterId);
  window.location.href = url.toString();
}

function openDeleteStoryModal(story) {
  storyPendingDeleteId = story.id;
  if (deleteStoryModalBody) {
    deleteStoryModalBody.textContent = `¿Seguro que quieres eliminar "${story.title}"? Esta acción no se puede deshacer.`;
  }
  deleteStoryModal?.classList.remove('hidden');
  deleteStoryModal?.setAttribute('aria-hidden', 'false');
}

function closeDeleteStoryModal() {
  storyPendingDeleteId = null;
  deleteStoryModal?.classList.add('hidden');
  deleteStoryModal?.setAttribute('aria-hidden', 'true');
}

function confirmDeleteStory() {
  if (!storyPendingDeleteId) return;
  deleteStory(storyPendingDeleteId);
  closeDeleteStoryModal();
}

function deleteStory(storyId) {
  const world = getCurrentWorld();
  if (!world) return;

  const stories = getStories(world).filter((story) => story.id !== storyId);
  world.stories = normalizeOrderedItems(stories);
  world.updatedAt = Date.now();
  selectedStoryId = world.stories[0]?.id || null;
  saveWorlds();
  setUrlStoryId(selectedStoryId);
  render();
}

function updateStoryTitle(storyId, title) {
  const world = getCurrentWorld();
  if (!world) return;

  const story = getStories(world).find((item) => item.id === storyId);
  if (!story) return;

  story.title = title.trim() || 'Historia sin título';
  story.updatedAt = Date.now();
  world.updatedAt = story.updatedAt;
  saveWorlds();
  renderStoriesList();
}

function reorderStoriesFromDom() {
  const world = getCurrentWorld();
  if (!world || !storiesList) return;

  const storiesById = new Map(getStories(world).map((story) => [story.id, story]));
  const orderedIds = Array.from(storiesList.querySelectorAll('[data-story-id]')).map(
    (button) => button.dataset.storyId
  );
  const reordered = orderedIds.map((storyId) => storiesById.get(storyId)).filter(Boolean);

  reordered.forEach((story, index) => {
    story.order = index + 1;
  });

  world.stories = reordered;
  world.updatedAt = Date.now();
  saveWorlds();
  render();
}

function reorderChaptersFromDom(story) {
  if (!story || !storyEditor) return;

  const chaptersById = new Map((story.chapters || []).map((chapter) => [chapter.id, chapter]));
  const chapterList = storyEditor.querySelector('.chapters-list');
  if (!chapterList) return;

  const orderedIds = Array.from(chapterList.querySelectorAll('[data-chapter-id]')).map(
    (button) => button.dataset.chapterId
  );
  const reordered = orderedIds.map((chapterId) => chaptersById.get(chapterId)).filter(Boolean);

  reordered.forEach((chapter, index) => {
    chapter.order = index + 1;
  });

  story.chapters = reordered;
  story.updatedAt = Date.now();

  const world = getCurrentWorld();
  if (world) world.updatedAt = story.updatedAt;

  saveWorlds();
  renderStoryEditor();
}

function getDragAfterElement(container, y, selector) {
  const draggableElements = Array.from(container.querySelectorAll(`${selector}:not(.is-dragging)`));

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }

      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

function setupSortableList(container, selector, onReorder) {
  if (!container) return;

  const items = Array.from(container.querySelectorAll(selector));
  items.forEach((item) => {
    item.setAttribute('draggable', 'true');
    item.classList.add('sortable-item');

    item.addEventListener('dragstart', () => {
      item.classList.add('is-dragging');
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('is-dragging');
    });
  });

  container.ondragover = (event) => {
    event.preventDefault();
    const dragging = container.querySelector(`${selector}.is-dragging`);
    if (!dragging) return;

    const afterElement = getDragAfterElement(container, event.clientY, selector);
    if (afterElement == null) {
      container.appendChild(dragging);
    } else {
      container.insertBefore(dragging, afterElement);
    }
  };

  container.ondrop = (event) => {
    event.preventDefault();
    onReorder();
  };
}

function renderStoriesList() {
  const world = getCurrentWorld();
  if (!world || !storiesList || !storyCount) return;

  normalizeWorldData(world);

  const stories = getStories(world);
  const selectedStory = getSelectedStory(world);
  storyCount.textContent = String(stories.length);
  if (storyCountCompact) storyCountCompact.textContent = String(stories.length);

  storiesList.innerHTML = stories.length
    ? stories
        .map((story) => {
          const activeClass = story.id === selectedStory?.id ? 'is-active' : '';
          const chapterCount = Array.isArray(story.chapters) ? story.chapters.length : 0;

          return `
            <button class="story-card ${activeClass}" type="button" data-story-id="${story.id}">
              <strong>${escapeHtml(story.title)}</strong>
              <span>${chapterCount} capítulo${chapterCount === 1 ? '' : 's'}</span>
            </button>
          `;
        })
        .join('')
    : '<div class="empty-state"><strong>No hay historias todavía.</strong><p>Pulsa “Nueva historia” para empezar.</p></div>';

  if (compactStoriesList) {
    compactStoriesList.innerHTML = storiesList.innerHTML;
  }

  storiesList.querySelectorAll('[data-story-id]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedStoryId = button.dataset.storyId || null;
      setUrlStoryId(selectedStoryId);
      render();
    });
  });

  if (compactStoriesList) {
    compactStoriesList.querySelectorAll('[data-story-id]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedStoryId = button.dataset.storyId || null;
        setUrlStoryId(selectedStoryId);
        render();
      });
    });
  }

  setupSortableList(storiesList, '[data-story-id]', reorderStoriesFromDom);
}

function renderStoryEditor() {
  const world = getCurrentWorld();
  if (!world || !storyEditor) return;

  normalizeWorldData(world);

  const selectedStory = getSelectedStory(world);
  if (!selectedStory) {
    storyEditor.innerHTML = '<div class="empty-state"><strong>Selecciona una historia.</strong><p>Podrás editar su nombre y sus capítulos desde aquí.</p></div>';
    return;
  }

  const selectedChapter = getSelectedChapter(selectedStory);
  const chapters = Array.isArray(selectedStory.chapters) ? selectedStory.chapters : [];

  storyEditor.innerHTML = `
    <div class="editor-section">
      <div class="story-actions">
        <button id="createChapterButton" class="action-button secondary" type="button">Añadir capítulo</button>
        <button id="deleteStoryButton" class="danger-button" type="button">Eliminar historia</button>
      </div>
    </div>

    <div class="editor-section">
      <div class="panel-heading">
        <h3>Capítulos</h3>
        <span>${chapters.length}</span>
      </div>
      <div class="chapters-list">
        ${
          chapters.length
            ? chapters
                .map((chapter) => {
                  const activeClass = chapter.id === selectedChapter?.id ? 'is-active' : '';

                  return `
                    <button class="chapter-card ${activeClass}" type="button" data-chapter-id="${chapter.id}">
                      <span class="chapter-card-main">
                        <strong class="chapter-card-title">${escapeHtml(chapter.title)}</strong>
                        <span class="chapter-card-separator" aria-hidden="true">·</span>
                        <span class="chapter-card-summary">${escapeHtml(chapter.summary?.trim() || 'Sin resumen todavía.')}</span>
                      </span>
                    </button>
                  `;
                })
                .join('')
            : '<div class="empty-state"><strong>No hay capítulos todavía.</strong><p>Crea uno para empezar a escribir.</p></div>'
        }
      </div>
    </div>
  `;

  document.getElementById('storyTitleInput')?.addEventListener('input', (event) => {
    updateStoryTitle(selectedStory.id, event.target.value);
  });

  document.getElementById('createChapterButton')?.addEventListener('click', () => createChapter(selectedStory));
  document.getElementById('deleteStoryButton')?.addEventListener('click', () => openDeleteStoryModal(selectedStory));

  storyEditor.querySelectorAll('[data-chapter-id]').forEach((button) => {
    button.addEventListener('click', () => openChapter(selectedStory.id, button.dataset.chapterId));
  });

  const chapterList = storyEditor.querySelector('.chapters-list');
  setupSortableList(chapterList, '[data-chapter-id]', () => reorderChaptersFromDom(selectedStory));
}

function render() {
  const world = getCurrentWorld();
  if (!world) {
    window.location.href = '../../../home/index.html';
    return;
  }

  const normalized = normalizeWorldData(world);
  if (normalized) saveWorlds();

  if (worldTitle) worldTitle.textContent = 'Historias';
  renderStoriesList();
  renderStoryEditor();
}

window.addEventListener('DOMContentLoaded', () => {
  loadWorlds();
  createStoryButton?.addEventListener('click', createStory);
  deleteStoryModalCancel?.addEventListener('click', closeDeleteStoryModal);
  deleteStoryModalConfirm?.addEventListener('click', confirmDeleteStory);
  deleteStoryModal?.addEventListener('click', (event) => {
    if (event.target === deleteStoryModal) {
      closeDeleteStoryModal();
    }
  });
  render();
});
