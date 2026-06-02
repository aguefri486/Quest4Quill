const STORAGE_KEY_WORLDS = 'quest4quill_worlds';
const STORAGE_KEY_SIDEBAR_COLLAPSED = 'quest4quill_world_sidebar_collapsed';

const sectionMap = {
  stories: {
    title: 'Historias',
    description: 'Aquí podemos listar las historias de este mundo.'
  },
  notes: {
    title: 'Notas',
    description: 'Aquí podremos editar las notas generales del mundo.'
  },
  characters: {
    title: 'Personajes',
    description: 'Aquí irá el listado de personajes del mundo.'
  },
  organizations: {
    title: 'Organizaciones',
    description: 'Aquí se verán las organizaciones vinculadas al mundo.'
  },
  locations: {
    title: 'Ubicaciones',
    description: 'Aquí podremos gestionar lugares y escenarios.'
  },
  items: {
    title: 'Objetos',
    description: 'Aquí irá el inventario de objetos importantes.'
  }
};

const worldName = document.getElementById('worldName');
const sectionTitle = document.getElementById('sectionTitle');
const sectionDescription = document.getElementById('sectionDescription');
const backButton = document.getElementById('backButton');
const sidebarToggle = document.getElementById('sidebarToggle');

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

function setActiveTab(tabId) {
  currentTab = tabId;

  document.querySelectorAll('.sidebar-tab').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tabId);
  });

  const section = sectionMap[tabId] || sectionMap.stories;
  if (sectionTitle) sectionTitle.textContent = section.title;
  if (sectionDescription) sectionDescription.textContent = section.description;
}

function applySidebarState() {
  document.body.classList.toggle('world-sidebar-collapsed', sidebarCollapsed);

  if (sidebarToggle) {
    sidebarToggle.setAttribute('aria-expanded', String(!sidebarCollapsed));
    sidebarToggle.setAttribute('aria-label', sidebarCollapsed ? 'Desplegar barra lateral' : 'Plegar barra lateral');
    sidebarToggle.textContent = sidebarCollapsed ? '›' : '‹';
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

function renderWorldHeader() {
  const world = getCurrentWorld();

  if (!world) {
    window.location.href = '../home/index.html';
    return;
  }

  if (worldName) worldName.textContent = world.name;
  document.title = `Quest4Quill · ${world.name}`;
}

window.addEventListener('DOMContentLoaded', () => {
  loadWorlds();
  loadSidebarState();
  renderWorldHeader();
  setActiveTab(currentTab);

  backButton?.addEventListener('click', () => {
    window.location.href = '../home/index.html';
  });

  sidebarToggle?.addEventListener('click', toggleSidebar);

  document.querySelectorAll('.sidebar-tab').forEach((button) => {
    button.addEventListener('click', () => setActiveTab(button.dataset.tab || 'stories'));
  });
});
