const STORAGE_KEY_WORLDS = 'quest4quill_worlds';

const worldTitle = document.getElementById('worldTitle');
const createLocationButton = document.getElementById('createLocationButton');
const locationsGrid = document.getElementById('locationsGrid');
const locationModal = document.getElementById('locationModal');
const locationModalClose = document.getElementById('locationModalClose');
const locationNameInput = document.getElementById('locationNameInput');
const locationNotesInput = document.getElementById('locationNotesInput');

let worlds = [];
let currentLocationId = null;

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

function getLocations(world) {
  if (!world) return [];
  if (!Array.isArray(world.locations)) world.locations = [];
  return world.locations;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeLocations(world) {
  const locations = getLocations(world);
  locations.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  locations.forEach((location, index) => {
    location.order = index + 1;
  });
}

function getNextLocationOrder(world) {
  return getLocations(world).reduce((highest, location) => Math.max(highest, Number(location.order) || 0), 0) + 1;
}

function createLocation() {
  const world = getCurrentWorld();
  if (!world) return;

  const now = Date.now();
  const location = {
    id: `location-${now}`,
    name: `Ubicación ${getLocations(world).length + 1}`,
    notes: '',
    order: getNextLocationOrder(world),
    createdAt: now,
    updatedAt: now
  };

  getLocations(world).push(location);
  world.updatedAt = now;
  saveWorlds();
  currentLocationId = location.id;
  renderLocations();
  openLocationModal(location.id);
}

function openLocationModal(locationId) {
  currentLocationId = locationId;
  const world = getCurrentWorld();
  if (!world) return;

  const location = getLocations(world).find((item) => item.id === locationId);
  if (!location) return;

  locationNameInput.value = location.name || '';
  locationNotesInput.value = location.notes || '';
  locationModal?.classList.remove('hidden');
  locationModal?.setAttribute('aria-hidden', 'false');
  setTimeout(() => locationNameInput?.focus(), 0);
}

function closeLocationModal() {
  locationModal?.classList.add('hidden');
  locationModal?.setAttribute('aria-hidden', 'true');
  currentLocationId = null;
}

function updateCurrentLocation(name, notes) {
  const world = getCurrentWorld();
  if (!world || !currentLocationId) return;

  const location = getLocations(world).find((item) => item.id === currentLocationId);
  if (!location) return;

  location.name = String(name).trim() || 'Ubicación sin nombre';
  location.notes = notes;
  location.updatedAt = Date.now();
  world.updatedAt = location.updatedAt;
  saveWorlds();
  renderLocations();
}

function getLocationSnippet(location) {
  const text = String(location.notes || '').trim();
  if (!text) return 'Escribe una descripción breve.';
  return text.slice(0, 180);
}

function renderLocations() {
  const world = getCurrentWorld();
  if (!world) {
    window.location.href = '../../../home/index.html';
    return;
  }

  if (!locationsGrid) return;

  normalizeLocations(world);

  if (worldTitle) worldTitle.textContent = 'Ubicaciones';

  const locations = getLocations(world);
  locationsGrid.innerHTML = locations.length
    ? locations
        .map((location) => {
          const hasNotes = Boolean(String(location.notes || '').trim());

          return `
            <button class="location-card" type="button" data-location-id="${location.id}">
              <div class="location-card-title">${escapeHtml(location.name)}</div>
              <div class="${hasNotes ? 'location-card-notes' : 'location-card-empty'}">${escapeHtml(getLocationSnippet(location))}</div>
            </button>
          `;
        })
        .join('')
    : `
      <button class="location-card" type="button" data-location-id="__new__">
        <div class="location-card-title">Nueva ubicación</div>
        <div class="location-card-empty">Pulsa “Añadir ubicación” para crear la primera.</div>
      </button>
    `;

  locationsGrid.querySelectorAll('[data-location-id]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.locationId === '__new__') {
        createLocation();
        return;
      }
      openLocationModal(button.dataset.locationId);
    });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  loadWorlds();
  createLocationButton?.addEventListener('click', createLocation);
  locationModalClose?.addEventListener('click', closeLocationModal);
  locationModal?.addEventListener('click', (event) => {
    if (event.target === locationModal) {
      closeLocationModal();
    }
  });
  locationNameInput?.addEventListener('input', () => {
    updateCurrentLocation(locationNameInput.value, locationNotesInput?.value || '');
  });
  locationNotesInput?.addEventListener('input', () => {
    updateCurrentLocation(locationNameInput?.value || '', locationNotesInput.value);
  });
  renderLocations();
});
