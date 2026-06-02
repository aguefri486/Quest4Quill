const STORAGE_KEY_WORLDS = 'quest4quill_worlds';

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

let worlds = [];
let currentTab = 'stories';

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
  renderWorldHeader();
  setActiveTab(currentTab);

  backButton?.addEventListener('click', () => {
    window.location.href = '../home/index.html';
  });

  document.querySelectorAll('.sidebar-tab').forEach((button) => {
    button.addEventListener('click', () => setActiveTab(button.dataset.tab || 'stories'));
  });
});
