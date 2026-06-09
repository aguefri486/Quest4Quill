const STORAGE_KEY_WORLDS = 'quest4quill_worlds';

const worldTitle = document.getElementById('worldTitle');
const itemListView = document.getElementById('itemListView');
const itemDetailView = document.getElementById('itemDetailView');
const itemsGrid = document.getElementById('itemsGrid');
const createItemButton = document.getElementById('createItemButton');
const deleteItemModal = document.getElementById('deleteItemModal');
const deleteItemModalBody = document.getElementById('deleteItemModalBody');
const deleteItemModalCancel = document.getElementById('deleteItemModalCancel');
const deleteItemModalConfirm = document.getElementById('deleteItemModalConfirm');

let worlds = [];
let selectedItemId = null;
let itemEditMode = false;
let itemPendingDeleteId = null;

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

function getItems(world) {
  if (!world) return [];
  if (!Array.isArray(world.items)) world.items = [];
  return world.items;
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

function getCharacters(world) {
  if (!world) return [];
  if (!Array.isArray(world.characters)) world.characters = [];
  return world.characters;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toArray(value) {
  return Array.isArray(value) ? value.slice() : [];
}

function areEqualArrays(first, second) {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

function normalizeIdList(values, validIds, excludedId = null) {
  const seen = new Set();
  return toArray(values).filter((value) => {
    const id = String(value || '');
    if (!id || id === excludedId || !validIds.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function setNormalizedArray(object, field, nextValue) {
  const currentValue = toArray(object[field]);
  const changed = !areEqualArrays(currentValue, nextValue);
  object[field] = nextValue;
  return changed;
}

function getOrderValue(item) {
  return Number(item?.order) || 0;
}

function compareByOrder(a, b) {
  const orderDiff = getOrderValue(a) - getOrderValue(b);
  if (orderDiff !== 0) return orderDiff;
  return (Number(a?.createdAt) || 0) - (Number(b?.createdAt) || 0);
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

function getEntityName(entity, fallback) {
  const candidates = [entity?.name, entity?.title, entity?.alias];
  const value = candidates.find((candidate) => String(candidate || '').trim());
  return String(value || fallback).trim();
}

function getItemName(item) {
  return getEntityName(item, 'Objeto sin nombre');
}

function getRegionName(region) {
  return getEntityName(region, 'Región sin nombre');
}

function getLocationName(location) {
  return getEntityName(location, 'Ubicación sin nombre');
}

function getCharacterName(character) {
  const firstName = String(character?.firstName || '').trim();
  const lastName = String(character?.lastName || '').trim();
  const secondLastName = String(character?.secondLastName || '').trim();
  const combinedName = [firstName, lastName, secondLastName].filter(Boolean).join(' ').trim();
  if (combinedName) return combinedName;
  return String(character?.alias || character?.title || 'Personaje sin nombre').trim();
}

function getItemTypeLabel(item) {
  return String(item?.type || '').trim() || 'Sin tipo';
}

function getRegionById(world, regionId) {
  return getRegions(world).find((region) => region.id === regionId) || null;
}

function getLocationById(world, locationId) {
  return getLocations(world).find((location) => location.id === locationId) || null;
}

function getCharacterById(world, characterId) {
  return getCharacters(world).find((character) => character.id === characterId) || null;
}

function getSortedRegions(world) {
  return getRegions(world)
    .slice()
    .sort((a, b) => getRegionName(a).localeCompare(getRegionName(b), 'es'));
}

function getSortedLocations(world) {
  return getLocations(world)
    .slice()
    .sort((a, b) => getLocationName(a).localeCompare(getLocationName(b), 'es'));
}

function getSortedCharacters(world) {
  return getCharacters(world)
    .slice()
    .sort((a, b) => getCharacterName(a).localeCompare(getCharacterName(b), 'es'));
}

function getLocationSelectValue(item) {
  const locationType = String(item?.locationType || '').trim();
  const locationId = String(item?.locationId || '').trim();
  if (!locationType || !locationId) return '';
  return `${locationType}:${locationId}`;
}

function parseLocationSelectValue(value) {
  const rawValue = String(value || '').trim();
  if (!rawValue) return { locationType: null, locationId: null };

  const [locationType, locationId] = rawValue.split(':');
  if (!['region', 'location'].includes(locationType) || !locationId) {
    return { locationType: null, locationId: null };
  }

  return { locationType, locationId };
}

function getItemLocationLabel(item, world) {
  const locationType = String(item?.locationType || '').trim();
  const locationId = String(item?.locationId || '').trim();
  const region = getRegionById(world, locationId);
  const location = getLocationById(world, locationId);

  if (locationType === 'region' && region) {
    return `Región · ${getRegionName(region)}`;
  }

  if (locationType === 'location' && location) {
    return `Ubicación · ${getLocationName(location)}`;
  }

  if (region) {
    return `Región · ${getRegionName(region)}`;
  }

  if (location) {
    return `Ubicación · ${getLocationName(location)}`;
  }

  return 'Sin localización';
}

function getItemHolderLabel(item, world) {
  const holder = item?.holderId ? getCharacterById(world, item.holderId) : null;
  return holder ? getCharacterName(holder) : 'Sin portador';
}

function normalizeItem(item, index, validRegionIds, validLocationIds, validCharacterIds) {
  let changed = false;

  if (typeof item.id !== 'string' || !item.id.trim()) {
    item.id = `item-${Date.now()}-${index}`;
    changed = true;
  }

  const name = String(item.name || '').trim();
  if (item.name !== name) {
    item.name = name;
    changed = true;
  }
  if (!item.name) {
    item.name = `Objeto ${index + 1}`;
    changed = true;
  }

  const type = String(item.type || '').trim();
  if (item.type !== type) {
    item.type = type;
    changed = true;
  }

  const description = String(item.description || '').trim();
  if (item.description !== description) {
    item.description = description;
    changed = true;
  }

  const rawLocationType = String(item.locationType || '').trim();
  const rawLocationId = String(item.locationId || '').trim();
  let nextLocationType = null;
  let nextLocationId = null;

  if (rawLocationType === 'region' && validRegionIds.has(rawLocationId)) {
    nextLocationType = 'region';
    nextLocationId = rawLocationId;
  } else if (rawLocationType === 'location' && validLocationIds.has(rawLocationId)) {
    nextLocationType = 'location';
    nextLocationId = rawLocationId;
  } else if (validRegionIds.has(rawLocationId)) {
    nextLocationType = 'region';
    nextLocationId = rawLocationId;
  } else if (validLocationIds.has(rawLocationId)) {
    nextLocationType = 'location';
    nextLocationId = rawLocationId;
  }

  if (item.locationType !== nextLocationType) {
    item.locationType = nextLocationType;
    changed = true;
  }

  if (item.locationId !== nextLocationId) {
    item.locationId = nextLocationId;
    changed = true;
  }

  const holderId = validCharacterIds.has(String(item.holderId || '')) ? String(item.holderId) : null;
  if (item.holderId !== holderId) {
    item.holderId = holderId;
    changed = true;
  }

  if (!item.createdAt) {
    item.createdAt = Date.now();
    changed = true;
  }

  if (!item.updatedAt) {
    item.updatedAt = item.createdAt;
    changed = true;
  }

  return changed;
}

function syncItemHolderRelations(world) {
  const characters = getCharacters(world);
  const items = getItems(world);
  const characterById = new Map(characters.map((character) => [character.id, character]));
  const itemIds = new Set(items.map((item) => item.id));
  let changed = false;

  characters.forEach((character) => {
    const nextItemIds = normalizeIdList(character.itemIds, itemIds);
    if (!areEqualArrays(nextItemIds, character.itemIds)) {
      character.itemIds = nextItemIds;
      changed = true;
    }
  });

  items.forEach((item) => {
    const explicitHolderId = characterById.has(String(item.holderId || '')) ? String(item.holderId) : null;
    const inferredHolderId =
      explicitHolderId ||
      characters.find((character) => toArray(character.itemIds).includes(item.id))?.id ||
      null;

    if (item.holderId !== inferredHolderId) {
      item.holderId = inferredHolderId;
      changed = true;
    }

    if (!inferredHolderId) return;

    const holderCharacter = characterById.get(inferredHolderId);
    if (!holderCharacter) return;

    const holderItems = toArray(holderCharacter.itemIds);
    if (!holderItems.includes(item.id)) {
      holderCharacter.itemIds = [...holderItems, item.id];
      changed = true;
    }

    characters.forEach((otherCharacter) => {
      if (otherCharacter.id === holderCharacter.id) return;
      const otherItems = toArray(otherCharacter.itemIds);
      if (!otherItems.includes(item.id)) return;
      otherCharacter.itemIds = otherItems.filter((itemId) => itemId !== item.id);
      changed = true;
    });
  });

  return changed;
}

function normalizeWorldData(world) {
  let changed = false;

  if (!Array.isArray(world.items)) {
    world.items = [];
    changed = true;
  }

  if (!Array.isArray(world.regions)) {
    world.regions = [];
    changed = true;
  }

  if (!Array.isArray(world.locations)) {
    world.locations = [];
    changed = true;
  }

  if (!Array.isArray(world.characters)) {
    world.characters = [];
    changed = true;
  }

  const now = Date.now();
  world.items.forEach((item, index) => {
    if (!item.id) {
      item.id = `item-${now}-${index}`;
      changed = true;
    }
  });

  const normalizedItems = normalizeOrderedItems(world.items);
  if (
    normalizedItems.length !== world.items.length ||
    normalizedItems.some((item, index) => item !== world.items[index])
  ) {
    changed = true;
  }
  world.items = normalizedItems;

  const regionIds = new Set(world.regions.map((region) => region.id));
  const locationIds = new Set(world.locations.map((location) => location.id));
  const characterIds = new Set(world.characters.map((character) => character.id));

  world.items.forEach((item, index) => {
    changed = normalizeItem(item, index, regionIds, locationIds, characterIds) || changed;
  });

  changed = syncItemHolderRelations(world) || changed;

  return changed;
}

function setUrlItemId(itemId) {
  const url = new URL(window.location.href);
  if (itemId) {
    url.searchParams.set('itemId', itemId);
  } else {
    url.searchParams.delete('itemId');
  }
  window.history.replaceState({}, '', url);
}

function getSelectedItem(world) {
  const items = getItems(world);
  if (items.length === 0) return null;

  const fromState = items.find((item) => item.id === selectedItemId);
  if (fromState) return fromState;

  const fromQuery = new URLSearchParams(window.location.search).get('itemId');
  const fromUrl = items.find((item) => item.id === fromQuery);
  if (fromUrl) {
    selectedItemId = fromUrl.id;
    return fromUrl;
  }

  return null;
}

function getNextItemOrder(world) {
  return getItems(world).reduce((highest, item) => Math.max(highest, getOrderValue(item)), 0) + 1;
}

function openItemDetail(itemId) {
  selectedItemId = itemId;
  itemEditMode = false;
  setUrlItemId(itemId);
  render();
}

function showItemList() {
  selectedItemId = null;
  itemEditMode = false;
  setUrlItemId(null);
  render();
}

function toggleItemEditMode() {
  itemEditMode = !itemEditMode;
  render();
}

function createItem() {
  const world = getCurrentWorld();
  if (!world) return;

  normalizeWorldData(world);

  const now = Date.now();
  const items = getItems(world);
  const item = {
    id: `item-${now}`,
    name: `Objeto ${items.length + 1}`,
    type: '',
    locationType: null,
    locationId: null,
    holderId: null,
    description: '',
    order: getNextItemOrder(world),
    createdAt: now,
    updatedAt: now
  };

  items.push(item);
  world.updatedAt = now;
  selectedItemId = item.id;
  itemEditMode = true;
  saveWorlds();
  setUrlItemId(item.id);
  render();
}

function updateItemField(item, field, value) {
  if (!item) return;

  if (field === 'name') {
    item.name = String(value).trim() || 'Objeto sin nombre';
  } else {
    item[field] = String(value).trim();
  }

  item.updatedAt = Date.now();
  const world = getCurrentWorld();
  if (world) world.updatedAt = item.updatedAt;
  saveWorlds();
}

function updateItemLocation(item, value) {
  const world = getCurrentWorld();
  if (!world || !item) return;

  const nextLocation = parseLocationSelectValue(value);
  item.locationType = nextLocation.locationType;
  item.locationId = nextLocation.locationId;
  item.updatedAt = Date.now();
  world.updatedAt = item.updatedAt;
  saveWorlds();
}

function updateItemHolder(item, holderId) {
  const world = getCurrentWorld();
  if (!world || !item) return;

  const characters = getCharacters(world);
  const currentHolderId = String(item.holderId || '');
  const nextHolderId = String(holderId || '');
  if (currentHolderId === nextHolderId) return;

  characters.forEach((character) => {
    const itemIds = toArray(character.itemIds);
    if (!itemIds.includes(item.id)) return;

    if (!nextHolderId || character.id !== nextHolderId) {
      character.itemIds = itemIds.filter((itemId) => itemId !== item.id);
    }
  });

  const nextHolder = nextHolderId ? characters.find((character) => character.id === nextHolderId) : null;
  if (nextHolder) {
    const nextItemIds = toArray(nextHolder.itemIds);
    if (!nextItemIds.includes(item.id)) {
      nextHolder.itemIds = [...nextItemIds, item.id];
    }
    item.holderId = nextHolder.id;
  } else {
    item.holderId = null;
  }

  item.updatedAt = Date.now();
  world.updatedAt = item.updatedAt;
  saveWorlds();
}

function openDeleteItemModal(item) {
  if (!item) return;

  itemPendingDeleteId = item.id;
  if (deleteItemModalBody) {
    const holder = item.holderId ? getCharacterById(getCurrentWorld(), item.holderId) : null;
    deleteItemModalBody.textContent =
      `¿Seguro que quieres eliminar "${getItemName(item)}"? Esta acción no se puede deshacer. ` +
      (holder ? `Se desvinculará también de ${getCharacterName(holder)}.` : 'Se desvinculará de cualquier portador.');
  }

  deleteItemModal?.classList.remove('hidden');
  deleteItemModal?.setAttribute('aria-hidden', 'false');
}

function closeDeleteItemModal() {
  itemPendingDeleteId = null;
  deleteItemModal?.classList.add('hidden');
  deleteItemModal?.setAttribute('aria-hidden', 'true');
}

function deleteItem(itemId) {
  const world = getCurrentWorld();
  if (!world) return;

  world.items = getItems(world).filter((item) => item.id !== itemId);
  getCharacters(world).forEach((character) => {
    if (!Array.isArray(character.itemIds)) return;
    character.itemIds = character.itemIds.filter((id) => id !== itemId);
  });

  world.updatedAt = Date.now();
  if (selectedItemId === itemId) {
    selectedItemId = null;
    itemEditMode = false;
    setUrlItemId(null);
  }

  saveWorlds();
  closeDeleteItemModal();
  render();
}

function renderItemCard(item, world) {
  const typeLabel = getItemTypeLabel(item);
  const locationLabel = getItemLocationLabel(item, world);
  const holderLabel = getItemHolderLabel(item, world);

  return `
    <button class="item-card" type="button" data-item-id="${escapeHtml(item.id)}">
      <span class="item-card-copy">
        <strong>${escapeHtml(getItemName(item))}</strong>
        <span>${escapeHtml(typeLabel)}</span>
        <small>${escapeHtml(locationLabel)} · ${escapeHtml(holderLabel)}</small>
      </span>
    </button>
  `;
}

function renderItemInfoRow(label, value, emptyLabel) {
  const text = String(value || '').trim();
  return `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${text ? escapeHtml(text) : `<span class="item-empty-text">${escapeHtml(emptyLabel)}</span>`}</dd>
    </div>
  `;
}

function renderItemDetail(item) {
  const world = getCurrentWorld();
  if (!world || !itemDetailView) return;

  itemListView?.classList.add('hidden');
  itemDetailView.classList.remove('hidden');

  const editable = itemEditMode;
  const selectedLocationValue = getLocationSelectValue(item);
  const sortedRegions = getSortedRegions(world);
  const sortedLocations = getSortedLocations(world);
  const sortedCharacters = getSortedCharacters(world);
  const locationOptions = [
    '<option value="">Sin localización</option>',
    sortedRegions.length
      ? `<optgroup label="Regiones">
          ${sortedRegions
            .map((region) => {
              const value = `region:${region.id}`;
              const selected = selectedLocationValue === value;
              return `<option value="${escapeHtml(value)}" ${selected ? 'selected' : ''}>${escapeHtml(getRegionName(region))}</option>`;
            })
            .join('')}
        </optgroup>`
      : '',
    sortedLocations.length
      ? `<optgroup label="Ubicaciones">
          ${sortedLocations
            .map((location) => {
              const value = `location:${location.id}`;
              const selected = selectedLocationValue === value;
              return `<option value="${escapeHtml(value)}" ${selected ? 'selected' : ''}>${escapeHtml(getLocationName(location))}</option>`;
            })
            .join('')}
        </optgroup>`
      : ''
  ].join('');

  const holderOptions = [
    '<option value="">Sin portador</option>',
    sortedCharacters
      .map((character) => {
        const selected = String(item.holderId || '') === character.id;
        return `<option value="${escapeHtml(character.id)}" ${selected ? 'selected' : ''}>${escapeHtml(getCharacterName(character))}</option>`;
      })
      .join('')
  ].join('');

  itemDetailView.innerHTML = `
    <div class="item-detail-header">
      <div class="item-detail-title">
        <p class="detail-kicker">Objeto</p>
        <h2 class="page-title">${escapeHtml(getItemName(item))}</h2>
      </div>
      <div class="item-detail-actions">
        <button id="backToItemsButton" class="action-button secondary" type="button">← Objetos</button>
        <button id="toggleItemEditButton" class="action-button" type="button">${editable ? 'Hecho' : 'Editar'}</button>
        <button id="deleteItemButton" class="danger-button" type="button">Eliminar objeto</button>
      </div>
    </div>

    <div class="item-main-grid">
      <section class="item-about-panel">
        <h3>Descripción</h3>
        ${
          editable
            ? `
              <div class="field">
                <label for="itemDescriptionInput">Descripción</label>
                <textarea id="itemDescriptionInput" placeholder="Describe el objeto">${escapeHtml(item.description || '')}</textarea>
              </div>
            `
            : String(item.description || '').trim()
              ? `<div class="item-about-text">${escapeHtml(item.description || '')}</div>`
              : '<div class="item-empty-text">Sin descripción.</div>'
        }
      </section>

      <aside class="item-info-panel">
        <h3>Información general</h3>
        ${
          editable
            ? `
              <div class="item-edit-section">
                <div class="field">
                  <label for="itemNameInput">Nombre</label>
                  <input id="itemNameInput" type="text" value="${escapeHtml(item.name || '')}" />
                </div>
                <div class="field">
                  <label for="itemTypeInput">Tipo</label>
                  <input id="itemTypeInput" type="text" value="${escapeHtml(item.type || '')}" placeholder="Arma, libro, reliquia..." />
                </div>
                <div class="field">
                  <label for="itemLocationSelect">Localización</label>
                  <select id="itemLocationSelect">${locationOptions}</select>
                </div>
                <div class="field">
                  <label for="itemHolderSelect">Portador</label>
                  <select id="itemHolderSelect">${holderOptions}</select>
                </div>
              </div>
            `
            : `
              <dl class="item-info-list">
                ${renderItemInfoRow('Nombre', getItemName(item), 'Sin nombre.')}
                ${renderItemInfoRow('Tipo', getItemTypeLabel(item), 'Sin tipo.')}
                ${renderItemInfoRow('Localización', getItemLocationLabel(item, world), 'Sin localización.')}
                ${renderItemInfoRow('Portador', getItemHolderLabel(item, world), 'Sin portador.')}
              </dl>
            `
        }
      </aside>
    </div>
  `;

  document.getElementById('backToItemsButton')?.addEventListener('click', showItemList);
  document.getElementById('toggleItemEditButton')?.addEventListener('click', toggleItemEditMode);
  document.getElementById('deleteItemButton')?.addEventListener('click', () => {
    openDeleteItemModal(item);
  });

  if (editable) {
    document.getElementById('itemNameInput')?.addEventListener('input', (event) => {
      updateItemField(item, 'name', event.target.value);
      const title = itemDetailView.querySelector('.item-detail-title .page-title');
      if (title) {
        title.textContent = String(event.target.value).trim() || 'Objeto sin nombre';
      }
    });

    document.getElementById('itemTypeInput')?.addEventListener('input', (event) => {
      updateItemField(item, 'type', event.target.value);
    });

    document.getElementById('itemDescriptionInput')?.addEventListener('input', (event) => {
      updateItemField(item, 'description', event.target.value);
    });

    document.getElementById('itemLocationSelect')?.addEventListener('change', (event) => {
      updateItemLocation(item, event.target.value);
    });

    document.getElementById('itemHolderSelect')?.addEventListener('change', (event) => {
      updateItemHolder(item, event.target.value);
    });
  }
}

function renderItemsList() {
  const world = getCurrentWorld();
  if (!world || !itemsGrid) return;

  itemListView?.classList.remove('hidden');
  itemDetailView?.classList.add('hidden');

  if (worldTitle) worldTitle.textContent = 'Objetos';

  const items = getItems(world);
  if (!items.length) {
    itemsGrid.innerHTML = `
      <div class="empty-state">
        <strong>No hay objetos creados.</strong>
        <p>Usa el botón “Añadir objeto” para crear el primero.</p>
      </div>
    `;
    return;
  }

  itemsGrid.innerHTML = items
    .map((item) => renderItemCard(item, world))
    .join('');

  itemsGrid.querySelectorAll('[data-item-id]').forEach((button) => {
    button.addEventListener('click', () => openItemDetail(button.dataset.itemId));
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

  const selectedItem = getSelectedItem(world);
  if (selectedItem) {
    renderItemDetail(selectedItem);
    return;
  }

  itemEditMode = false;
  renderItemsList();
}

window.addEventListener('DOMContentLoaded', () => {
  loadWorlds();

  createItemButton?.addEventListener('click', createItem);
  deleteItemModalCancel?.addEventListener('click', closeDeleteItemModal);
  deleteItemModalConfirm?.addEventListener('click', () => {
    if (!itemPendingDeleteId) return;
    deleteItem(itemPendingDeleteId);
  });
  deleteItemModal?.addEventListener('click', (event) => {
    if (event.target === deleteItemModal) {
      closeDeleteItemModal();
    }
  });

  render();
});
