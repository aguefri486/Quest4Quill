const STORAGE_KEY_WORLDS = 'quest4quill_worlds';

const REGION_TYPES = ['continent', 'country', 'community', 'settlement'];
const REGION_LABELS = {
  continent: 'Continente',
  country: 'País',
  community: 'Comunidad',
  settlement: 'Asentamiento'
};
const worldTitle = document.getElementById('worldTitle');
const regionCount = document.getElementById('regionCount');
const regionCountCompact = document.getElementById('regionCountCompact');
const regionsList = document.getElementById('regionsList');
const compactRegionsList = document.getElementById('compactRegionsList');
const regionEditor = document.getElementById('regionEditor');
const createRegionButton = document.getElementById('createRegionButton');

let worlds = [];
let selectedRegionId = null;

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

function getRegions(world) {
  if (!world) return [];
  if (!Array.isArray(world.regions)) world.regions = [];
  return world.regions;
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

function getTypeLabel(type) {
  return REGION_LABELS[type] || REGION_LABELS.continent;
}

function getTypeOrder(type) {
  return REGION_TYPES.indexOf(type);
}

function getAllowedChildTypes(type) {
  const currentIndex = getTypeOrder(type);
  if (currentIndex < 0) return [];

  return REGION_TYPES.slice(currentIndex + 1);
}

function findRegionByName(world, name, allowedTypes = []) {
  const normalizedName = String(name || '').trim().toLowerCase();
  if (!normalizedName) return null;

  return getRegions(world).find((region) => {
    const matchesName = String(region.name || '').trim().toLowerCase() === normalizedName;
    const matchesType = allowedTypes.length === 0 || allowedTypes.includes(region.type);
    return matchesName && matchesType;
  }) || null;
}

function findLocationByName(world, name) {
  const normalizedName = String(name || '').trim().toLowerCase();
  if (!normalizedName) return null;

  return getLocations(world).find(
    (location) => String(location.name || '').trim().toLowerCase() === normalizedName
  ) || null;
}

function getWritableSelectOptions(items) {
  return items.map((item) => ({
    value: item.name,
    label: item.name,
    meta: item.type ? getTypeLabel(item.type) : null,
    id: item.id
  }));
}

function renderWritableSelectMarkup({ inputId, panelId, placeholder, options }) {
  return `
    <div class="writable-select-shell" data-writable-select>
      <input
        id="${inputId}"
        class="writable-select-input"
        type="text"
        autocomplete="off"
        placeholder="${placeholder}"
      />
      <div id="${panelId}" class="writable-select-panel hidden" aria-hidden="true">
        ${
          options.length
            ? options
                .map(
                  (option) => `
                    <button
                      type="button"
                      class="writable-select-option"
                      data-writable-select-option
                      data-value="${escapeHtml(option.value)}"
                    >
                      <span>${escapeHtml(option.label)}</span>
                      ${option.meta ? `<small>${escapeHtml(option.meta)}</small>` : ''}
                    </button>
                  `
                )
                .join('')
            : '<div class="writable-select-empty">No hay elementos disponibles.</div>'
        }
      </div>
    </div>
  `;
}

function setupWritableSelect({ inputId, panelId, options, onPick }) {
  const input = document.getElementById(inputId);
  const panel = document.getElementById(panelId);
  if (!input || !panel) return;

  const updatePanel = () => {
    const query = String(input.value || '').trim().toLowerCase();
    const buttons = Array.from(panel.querySelectorAll('[data-writable-select-option]'));
    let visibleCount = 0;

    buttons.forEach((button) => {
      const optionText = String(button.dataset.value || '').trim().toLowerCase();
      const matches = query === '' || optionText.includes(query);
      button.classList.toggle('hidden', !matches);
      if (matches) visibleCount += 1;
    });

    const emptyState = panel.querySelector('.writable-select-empty');
    if (emptyState) {
      emptyState.classList.toggle('hidden', visibleCount > 0);
    }
  };

  const openPanel = () => {
    updatePanel();
    panel.classList.remove('hidden');
    panel.setAttribute('aria-hidden', 'false');
  };

  const closePanel = () => {
    panel.classList.add('hidden');
    panel.setAttribute('aria-hidden', 'true');
  };

  input.addEventListener('focus', openPanel);
  input.addEventListener('click', openPanel);
  input.addEventListener('input', openPanel);
  input.addEventListener('blur', () => {
    window.setTimeout(closePanel, 120);
  });
  panel.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closePanel();
      input.blur();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const firstVisible = panel.querySelector('[data-writable-select-option]:not(.hidden)');
      if (firstVisible) {
        const value = firstVisible.dataset.value || '';
        input.value = value;
        onPick(value);
        closePanel();
      }
    }
  });

  panel.querySelectorAll('[data-writable-select-option]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.value || '';
      input.value = value;
      onPick(value);
      closePanel();
    });
  });
}

function normalizeOrderedItems(items) {
  const ordered = items.slice().sort((a, b) => {
    const orderDiff = (Number(a.order) || 0) - (Number(b.order) || 0);
    if (orderDiff !== 0) return orderDiff;
    return (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0);
  });

  ordered.forEach((item, index) => {
    item.order = index + 1;
  });

  return ordered;
}

function normalizeWorldData(world) {
  let changed = false;

  if (!Array.isArray(world.regions)) {
    world.regions = [];
    changed = true;
  }

  if (!Array.isArray(world.locations)) {
    world.locations = [];
    changed = true;
  }

  const normalizedLocations = normalizeOrderedItems(world.locations);
  const locationsChanged =
    normalizedLocations.length !== world.locations.length ||
    normalizedLocations.some((location, index) => location !== world.locations[index]);
  if (locationsChanged) changed = true;
  world.locations = normalizedLocations;

  const locationIds = new Set(world.locations.map((location) => location.id));
  const regionIds = new Set(world.regions.map((region) => region.id));

  const normalizedRegions = normalizeOrderedItems(world.regions).map((region) => {
    const nextRegion = region;
    if (!REGION_TYPES.includes(nextRegion.type)) {
      nextRegion.type = 'continent';
      changed = true;
    }

    if (typeof nextRegion.name !== 'string') {
      nextRegion.name = '';
      changed = true;
    }

    if (typeof nextRegion.notes !== 'string') {
      nextRegion.notes = '';
      changed = true;
    }

    if (!Array.isArray(nextRegion.childRegionIds)) {
      nextRegion.childRegionIds = [];
      changed = true;
    }

    if (!Array.isArray(nextRegion.locationIds)) {
      nextRegion.locationIds = [];
      changed = true;
    }

    const allowedChildTypes = getAllowedChildTypes(nextRegion.type);
    const normalizedChildIds = nextRegion.childRegionIds.filter((childId) => {
      const childRegion = world.regions.find((item) => item.id === childId);
      return (
        childRegion &&
        childRegion.id !== nextRegion.id &&
        allowedChildTypes.includes(childRegion.type)
      );
    });
    if (normalizedChildIds.length !== nextRegion.childRegionIds.length) {
      changed = true;
    }
    nextRegion.childRegionIds = normalizedChildIds;

    const normalizedLocationIds = nextRegion.locationIds.filter((locationId) => locationIds.has(locationId));
    if (normalizedLocationIds.length !== nextRegion.locationIds.length) {
      changed = true;
    }
    nextRegion.locationIds = normalizedLocationIds;

    return nextRegion;
  });

  const regionsChanged =
    normalizedRegions.length !== world.regions.length ||
    normalizedRegions.some((region, index) => region !== world.regions[index]);
  if (regionsChanged) changed = true;
  world.regions = normalizedRegions;

  return changed;
}

function getRegionFromState(world) {
  const regions = getRegions(world);
  if (regions.length === 0) return null;

  const fromState = regions.find((region) => region.id === selectedRegionId);
  if (fromState) return fromState;

  const fromQuery = new URLSearchParams(window.location.search).get('regionId');
  const fromUrl = regions.find((region) => region.id === fromQuery);
  if (fromUrl) {
    selectedRegionId = fromUrl.id;
    return fromUrl;
  }

  selectedRegionId = regions[0].id;
  return regions[0];
}

function setUrlRegionId(regionId) {
  const url = new URL(window.location.href);
  if (regionId) {
    url.searchParams.set('regionId', regionId);
  } else {
    url.searchParams.delete('regionId');
  }
  window.history.replaceState({}, '', url);
}

function createRegion() {
  const world = getCurrentWorld();
  if (!world) return;

  normalizeWorldData(world);

  const regions = getRegions(world);
  const now = Date.now();
  const region = {
    id: `region-${now}`,
    name: `Región ${regions.length + 1}`,
    type: 'continent',
    notes: '',
    childRegionIds: [],
    locationIds: [],
    order: regions.length + 1,
    createdAt: now,
    updatedAt: now
  };

  regions.push(region);
  world.updatedAt = now;
  selectedRegionId = region.id;
  saveWorlds();
  setUrlRegionId(region.id);
  render();
}

function updateRegionField(regionId, field, value) {
  const world = getCurrentWorld();
  if (!world) return;

  const region = getRegions(world).find((item) => item.id === regionId);
  if (!region) return;

  region[field] = field === 'name' ? String(value).trim() || getTypeLabel(region.type) : value;
  region.updatedAt = Date.now();
  world.updatedAt = region.updatedAt;
  saveWorlds();
  renderRegionsList();
}

function toggleRegionChild(regionId, childRegionId) {
  const world = getCurrentWorld();
  if (!world) return;

  const region = getRegions(world).find((item) => item.id === regionId);
  if (!region) return;

  const children = Array.isArray(region.childRegionIds) ? region.childRegionIds.slice() : [];
  const index = children.indexOf(childRegionId);
  if (index >= 0) {
    children.splice(index, 1);
  } else {
    children.push(childRegionId);
  }

  region.childRegionIds = children;
  region.updatedAt = Date.now();
  world.updatedAt = region.updatedAt;
  saveWorlds();
  renderRegionEditor();
}

function toggleRegionLocation(regionId, locationId) {
  const world = getCurrentWorld();
  if (!world) return;

  const region = getRegions(world).find((item) => item.id === regionId);
  if (!region) return;

  const locations = Array.isArray(region.locationIds) ? region.locationIds.slice() : [];
  const index = locations.indexOf(locationId);
  if (index >= 0) {
    locations.splice(index, 1);
  } else {
    locations.push(locationId);
  }

  region.locationIds = locations;
  region.updatedAt = Date.now();
  world.updatedAt = region.updatedAt;
  saveWorlds();
  renderRegionEditor();
}

function addRegionChildByName(regionId, value) {
  const world = getCurrentWorld();
  if (!world) return;

  const region = getRegions(world).find((item) => item.id === regionId);
  if (!region) return;

  const childTypes = getAllowedChildTypes(region.type);
  const childRegion = findRegionByName(world, value, childTypes);
  if (!childRegion) return;

  const children = new Set(region.childRegionIds || []);
  children.add(childRegion.id);
  region.childRegionIds = Array.from(children);
  region.updatedAt = Date.now();
  world.updatedAt = region.updatedAt;
  saveWorlds();
  renderRegionEditor();
}

function addLocationByName(regionId, value) {
  const world = getCurrentWorld();
  if (!world) return;

  const region = getRegions(world).find((item) => item.id === regionId);
  if (!region) return;

  const location = findLocationByName(world, value);
  if (!location) return;

  const locations = new Set(region.locationIds || []);
  locations.add(location.id);
  region.locationIds = Array.from(locations);
  region.updatedAt = Date.now();
  world.updatedAt = region.updatedAt;
  saveWorlds();
  renderRegionEditor();
}

function renderRegionsList() {
  const world = getCurrentWorld();
  if (!world || !regionsList || !regionCount) return;

  normalizeWorldData(world);

  const regions = getRegions(world).slice().sort((a, b) => {
    const typeDiff = getTypeOrder(a.type) - getTypeOrder(b.type);
    if (typeDiff !== 0) return typeDiff;
    return (Number(a.order) || 0) - (Number(b.order) || 0);
  });

  const selectedRegion = getRegionFromState(world);
  regionCount.textContent = String(regions.length);
  if (regionCountCompact) regionCountCompact.textContent = String(regions.length);

  const regionsMarkup = regions.length
    ? regions
        .map((region) => {
          const activeClass = region.id === selectedRegion?.id ? 'is-active' : '';
          const childCount = Array.isArray(region.childRegionIds) ? region.childRegionIds.length : 0;
          const locationCount = Array.isArray(region.locationIds) ? region.locationIds.length : 0;

          return `
            <button class="region-card ${activeClass}" type="button" data-region-id="${region.id}">
              <strong>${escapeHtml(region.name)}</strong>
              <div class="region-card-meta">
                <span>${escapeHtml(getTypeLabel(region.type))}</span>
                <span>${childCount} subregión${childCount === 1 ? '' : 'es'}</span>
                <span>${locationCount} ubicación${locationCount === 1 ? '' : 'es'}</span>
              </div>
            </button>
          `;
        })
        .join('')
    : '<div class="empty-state"><strong>No hay regiones todavía.</strong><p>Pulsa “Añadir región” para empezar.</p></div>';

  regionsList.innerHTML = regionsMarkup;
  if (compactRegionsList) compactRegionsList.innerHTML = regionsMarkup;

  regionsList.querySelectorAll('[data-region-id]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedRegionId = button.dataset.regionId || null;
      setUrlRegionId(selectedRegionId);
      renderRegionEditor();
      renderRegionsList();
    });
  });

  if (compactRegionsList) {
    compactRegionsList.querySelectorAll('[data-region-id]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedRegionId = button.dataset.regionId || null;
        setUrlRegionId(selectedRegionId);
        renderRegionEditor();
        renderRegionsList();
      });
    });
  }
}

function renderRegionEditor() {
  const world = getCurrentWorld();
  if (!world || !regionEditor) return;

  normalizeWorldData(world);

  const region = getRegionFromState(world);
  if (!region) {
    regionEditor.innerHTML = '<div class="empty-state"><strong>Selecciona una región.</strong><p>Podrás definir su nombre, contenido, puntos de interés y notas aquí.</p></div>';
    return;
  }

  const allowedChildTypes = getAllowedChildTypes(region.type);
  const availableChildRegions = allowedChildTypes.length
    ? getRegions(world)
        .filter((item) => item.id !== region.id && allowedChildTypes.includes(item.type))
        .sort((a, b) => {
          const typeDiff = getTypeOrder(a.type) - getTypeOrder(b.type);
          if (typeDiff !== 0) return typeDiff;
          return String(a.name || '').localeCompare(String(b.name || ''), 'es');
        })
    : [];
  const availableLocations = getLocations(world);
  const selectedChildRegions = (region.childRegionIds || [])
    .map((childId) => getRegions(world).find((item) => item.id === childId))
    .filter(Boolean);
  const selectedLocations = (region.locationIds || [])
    .map((locationId) => getLocations(world).find((item) => item.id === locationId))
    .filter(Boolean);
  const childSelectOptions = getWritableSelectOptions(availableChildRegions);
  const locationSelectOptions = getWritableSelectOptions(availableLocations);

  regionEditor.innerHTML = `
    <div class="editor-section">
      <div class="region-fields">
        <div class="field">
          <label for="regionNameInput">Nombre de la región</label>
          <input id="regionNameInput" type="text" value="${escapeHtml(region.name)}" />
        </div>
        <div class="field">
          <label for="regionTypeSelect">Tipo</label>
          <select id="regionTypeSelect">
            ${REGION_TYPES.map((type) => `<option value="${type}" ${type === region.type ? 'selected' : ''}>${getTypeLabel(type)}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <div class="editor-section">
      <div class="region-section-title">
        <h3>Región Interior</h3>
        <span>${allowedChildTypes.length ? 'Puedes enlazar cualquier región inferior' : 'No contiene regiones inferiores'}</span>
      </div>
      ${
        allowedChildTypes.length
          ? `
            <div class="region-linker">
              <div class="field region-linker-field">
                <label for="childRegionInput">Añadir región interior</label>
                ${renderWritableSelectMarkup({
                  inputId: 'childRegionInput',
                  panelId: 'childRegionPanel',
                  placeholder: 'Escribe un nombre...',
                  options: childSelectOptions
                })}
              </div>
              <button id="addChildRegionButton" class="action-button secondary region-linker-button" type="button">Añadir</button>
            </div>
            ${
              selectedChildRegions.length
                ? `<div class="region-tag-list">
                    ${selectedChildRegions
                      .map(
                        (childRegion) => `
                          <button class="region-tag" type="button" data-remove-child-region-id="${childRegion.id}">
                            <span>${escapeHtml(childRegion.name)}</span>
                            <small>${escapeHtml(getTypeLabel(childRegion.type))}</small>
                            <span class="region-tag-close" aria-hidden="true">×</span>
                          </button>
                        `
                      )
                      .join('')}
                  </div>`
                : '<div class="region-empty-inline">Aún no hay regiones interiores enlazadas.</div>'
            }
          `
          : '<div class="region-empty-inline">Los asentamientos no contienen regiones inferiores.</div>'
      }
    </div>

    <div class="editor-section">
      <div class="region-section-title">
        <h3>Puntos de interés</h3>
        <span>${availableLocations.length ? `${availableLocations.length} disponibles` : 'No hay ubicaciones creadas'}</span>
      </div>
      ${
        availableLocations.length
          ? `
            <div class="region-linker">
              <div class="field region-linker-field">
                <label for="locationLinkInput">Añadir ubicación</label>
                ${renderWritableSelectMarkup({
                  inputId: 'locationLinkInput',
                  panelId: 'locationPanel',
                  placeholder: 'Escribe un nombre...',
                  options: locationSelectOptions
                })}
              </div>
              <button id="addLocationButton" class="action-button secondary region-linker-button" type="button">Añadir</button>
            </div>
            ${
              selectedLocations.length
                ? `<div class="region-tag-list">
                    ${selectedLocations
                      .map(
                        (location) => `
                          <button class="region-tag" type="button" data-remove-location-id="${location.id}">
                            <span>${escapeHtml(location.name)}</span>
                            <span class="region-tag-close" aria-hidden="true">×</span>
                          </button>
                        `
                      )
                      .join('')}
                  </div>`
                : '<div class="region-empty-inline">Aún no hay ubicaciones enlazadas.</div>'
            }
          `
          : '<div class="region-empty-inline">Crea ubicaciones en la pestaña de Ubicaciones para poder enlazarlas aquí.</div>'
      }
    </div>

    <div class="editor-section">
      <div class="field">
        <label for="regionNotesInput">Notas</label>
        <textarea id="regionNotesInput" placeholder="Información, contexto, relaciones, etc.">${escapeHtml(region.notes || '')}</textarea>
      </div>
    </div>
  `;

  document.getElementById('regionNameInput')?.addEventListener('input', (event) => {
    updateRegionField(region.id, 'name', event.target.value.trim() || getTypeLabel(region.type));
  });

  document.getElementById('regionTypeSelect')?.addEventListener('change', (event) => {
    const nextType = event.target.value;
    const allowedType = REGION_TYPES.includes(nextType) ? nextType : 'continent';
    const childTypes = getAllowedChildTypes(allowedType);
    const currentChildren = Array.isArray(region.childRegionIds) ? region.childRegionIds : [];
    const filteredChildren = childTypes.length
      ? currentChildren.filter((childRegionId) => {
          const childRegion = getRegions(world).find((item) => item.id === childRegionId);
          return childRegion && childTypes.includes(childRegion.type);
        })
      : [];

    region.type = allowedType;
    region.childRegionIds = filteredChildren;
    region.updatedAt = Date.now();
    world.updatedAt = region.updatedAt;
    saveWorlds();
    render();
  });

  document.getElementById('regionNotesInput')?.addEventListener('input', (event) => {
    updateRegionField(region.id, 'notes', event.target.value);
  });

  setupWritableSelect({
    inputId: 'childRegionInput',
    panelId: 'childRegionPanel',
    options: childSelectOptions,
    onPick: () => {}
  });

  setupWritableSelect({
    inputId: 'locationLinkInput',
    panelId: 'locationPanel',
    options: locationSelectOptions,
    onPick: () => {}
  });

  document.getElementById('addChildRegionButton')?.addEventListener('click', () => {
    const input = document.getElementById('childRegionInput');
    if (input) {
      addRegionChildByName(region.id, input.value);
      input.value = '';
    }
  });

  document.getElementById('childRegionInput')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addRegionChildByName(region.id, event.target.value);
      event.target.value = '';
    }
  });

  document.getElementById('addLocationButton')?.addEventListener('click', () => {
    const input = document.getElementById('locationLinkInput');
    if (input) {
      addLocationByName(region.id, input.value);
      input.value = '';
    }
  });

  document.getElementById('locationLinkInput')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addLocationByName(region.id, event.target.value);
      event.target.value = '';
    }
  });

  regionEditor.querySelectorAll('[data-remove-child-region-id]').forEach((button) => {
    button.addEventListener('click', () => toggleRegionChild(region.id, button.dataset.removeChildRegionId));
  });

  regionEditor.querySelectorAll('[data-remove-location-id]').forEach((button) => {
    button.addEventListener('click', () => toggleRegionLocation(region.id, button.dataset.removeLocationId));
  });
}

function render() {
  const world = getCurrentWorld();
  if (!world) {
    window.location.href = '../../../home/index.html';
    return;
  }

  const normalized = normalizeWorldData(world);
  if (normalized) saveWorlds();

  if (worldTitle) worldTitle.textContent = 'Regiones';
  renderRegionsList();
  renderRegionEditor();
}

window.addEventListener('DOMContentLoaded', () => {
  loadWorlds();
  createRegionButton?.addEventListener('click', createRegion);
  render();
});
