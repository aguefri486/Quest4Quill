const STORAGE_KEY_WORLDS = 'quest4quill_worlds';
const STORAGE_KEY_SIDEBAR_COLLAPSED = 'quest4quill_world_sidebar_collapsed';

const tabRoutes = {
  stories: 'subpages/stories/index.html',
  notes: 'subpages/notes/index.html',
  characters: 'subpages/characters/index.html',
  organizations: 'subpages/organizations/index.html',
  locations: 'subpages/locations/index.html',
  items: 'subpages/items/index.html'
};

const worldName = document.getElementById('worldName');
const backButton = document.getElementById('backButton');
const sidebarToggle = document.getElementById('sidebarToggle');
const worldFrame = document.getElementById('worldFrame');
const sidebarTabs = Array.from(document.querySelectorAll('.sidebar-tab'));

let worlds = [];
let currentTab = 'stories';
let sidebarCollapsed = false;

function loadWorlds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WORLDS);
    worlds = raw ? JSON.parse(raw) : [];
  } catch (error) {
    worlds = [];
  }
}

function getWorldIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('worldId');
}

function getCurrentWorld() {
  const worldId = getWorldIdFromUrl();
  return worlds.find((world) => world.id === worldId) || null;
}

function renderWorldHeader() {
  const world = getCurrentWorld();

  if (!world) {
    window.location.href = '../home/index.html';
    return;
  }

  if (worldName) worldName.textContent = world.name;
  document.title = `Quest4Quill · ${world.name}`;
}

function buildFrameUrl(tabId) {
  const route = tabRoutes[tabId] || tabRoutes.stories;
  const frameUrl = new URL(route, window.location.href);
  frameUrl.searchParams.set('worldId', getWorldIdFromUrl() || '');
  return frameUrl.toString();
}

function setActiveTab(tabId) {
  currentTab = tabId;

  sidebarTabs.forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tabId);
  });

  if (worldFrame) {
    worldFrame.src = buildFrameUrl(tabId);
  }
}

function applySidebarState() {
  document.body.classList.toggle('world-sidebar-collapsed', sidebarCollapsed);

  if (sidebarToggle) {
    sidebarToggle.setAttribute('aria-expanded', String(!sidebarCollapsed));
    sidebarToggle.setAttribute(
      'aria-label',
      sidebarCollapsed ? 'Desplegar barra lateral' : 'Plegar barra lateral'
    );
    sidebarToggle.textContent = sidebarCollapsed ? '›' : '‹';
  }

  if (backButton) {
    backButton.textContent = sidebarCollapsed ? '←' : '← Volver a mundos';
    backButton.setAttribute('aria-label', 'Volver a mundos');
  }
}

function loadSidebarState() {
  try {
    sidebarCollapsed = localStorage.getItem(STORAGE_KEY_SIDEBAR_COLLAPSED) === 'true';
  } catch (error) {
    sidebarCollapsed = false;
  }
  applySidebarState();
}

function saveSidebarState() {
  try {
    localStorage.setItem(STORAGE_KEY_SIDEBAR_COLLAPSED, String(sidebarCollapsed));
  } catch (error) {
    // ignore storage failures
  }
}

function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  applySidebarState();
  saveSidebarState();
}

window.addEventListener('DOMContentLoaded', () => {
  loadWorlds();
  loadSidebarState();
  renderWorldHeader();

  const params = new URLSearchParams(window.location.search);
  const initialTab = params.get('tab');
  setActiveTab(initialTab && tabRoutes[initialTab] ? initialTab : 'stories');

  backButton?.addEventListener('click', () => {
    window.location.href = '../home/index.html';
  });

  sidebarToggle?.addEventListener('click', toggleSidebar);

  sidebarTabs.forEach((button) => {
    button.addEventListener('click', () => {
      const tabId = button.dataset.tab || 'stories';
      setActiveTab(tabId);
    });
  });
});
