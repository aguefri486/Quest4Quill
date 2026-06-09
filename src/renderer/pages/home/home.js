const STORAGE_KEY_WORLDS = 'quest4quill_worlds';
const WORLD_EXPORT_TYPE = 'quest4quill-world';
const WORLD_BUNDLE_TYPE = 'quest4quill-world-bundle';

const worldList = document.getElementById('worldList');
const newWorldButton = document.getElementById('newWorldButton');
const importWorldsButton = document.getElementById('importWorldsButton');
const exportWorldsButton = document.getElementById('exportWorldsButton');
const worldImportInput = document.getElementById('worldImportInput');
const appModal = document.getElementById('appModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalCancelButton = document.getElementById('modalCancelButton');
const modalConfirmButton = document.getElementById('modalConfirmButton');

let worlds = [];
let modalConfirmAction = null;
let modalInput = null;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadWorlds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WORLDS);
    const parsed = raw ? JSON.parse(raw) : [];
    worlds = Array.isArray(parsed) ? parsed.filter(isPlainObject) : [];
  } catch (error) {
    worlds = [];
  }
}

function saveWorlds() {
  localStorage.setItem(STORAGE_KEY_WORLDS, JSON.stringify(worlds));
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function slugifyFileName(value) {
  return (
    String(value || 'mundo')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'mundo'
  );
}

function getWorldStats(world) {
  const stories = Array.isArray(world.stories) ? world.stories.length : 0;
  const characters = Array.isArray(world.characters) ? world.characters.length : 0;
  return `${stories} historias · ${characters} personajes`;
}

function getWorldDisplayName(world, fallback = 'Mundo sin nombre') {
  if (!isPlainObject(world)) return fallback;
  const name = typeof world.name === 'string' ? world.name.trim() : '';
  return name || fallback;
}

function openAppModal({
  title,
  body,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  showInput = false,
  inputValue = '',
  inputPlaceholder = ''
}) {
  if (!appModal || !modalTitle || !modalBody || !modalConfirmButton || !modalCancelButton) return;

  modalTitle.textContent = title;
  modalBody.innerHTML = '';

  const message = document.createElement('div');
  message.textContent = body;
  modalBody.appendChild(message);

  modalInput = null;
  if (showInput) {
    modalInput = document.createElement('input');
    modalInput.type = 'text';
    modalInput.className = 'modal-input';
    modalInput.value = inputValue;
    modalInput.placeholder = inputPlaceholder;
    modalBody.appendChild(modalInput);
  }

  modalConfirmButton.textContent = confirmText;
  modalCancelButton.textContent = cancelText;

  modalConfirmAction = () => {
    const value = showInput ? modalInput?.value.trim() || '' : undefined;
    if (showInput && !value) {
      modalInput?.focus();
      return;
    }

    onConfirm?.(value);
    closeAppModal();
  };

  appModal.classList.remove('hidden');
  setTimeout(() => modalInput?.focus(), 0);
}

function closeAppModal() {
  appModal?.classList.add('hidden');
  modalConfirmAction = null;
  modalInput = null;
  if (modalBody) modalBody.innerHTML = '';
}

function confirmAppModal() {
  if (typeof modalConfirmAction === 'function') {
    modalConfirmAction();
  }
}

function openNewWorldModal() {
  const defaultName = `Mundo ${worlds.length + 1}`;
  openAppModal({
    title: 'Crear nuevo mundo',
    body: 'Introduce el nombre del nuevo mundo.',
    confirmText: 'Crear',
    cancelText: 'Cancelar',
    showInput: true,
    inputValue: defaultName,
    inputPlaceholder: 'Nombre del mundo',
    onConfirm: createNewWorld
  });
}

function createNewWorld(worldName) {
  const trimmedName = worldName.trim();
  if (!trimmedName) return;

  const now = Date.now();
  const newWorld = {
    id: `world-${now}`,
    name: trimmedName,
    stories: [],
    notes: [],
    characters: [],
    organizations: [],
    locations: [],
    items: [],
    createdAt: now,
    updatedAt: now
  };

  worlds.unshift(newWorld);
  saveWorlds();
  renderWorldList();
  openWorld(newWorld.id);
}

function deleteWorldById(worldId) {
  worlds = worlds.filter((world) => world.id !== worldId);
  saveWorlds();
  renderWorldList();
}

function confirmDeleteWorld(world) {
  openAppModal({
    title: 'Eliminar mundo',
    body: `¿Seguro que quieres eliminar "${getWorldDisplayName(world)}"? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    cancelText: 'Cancelar',
    onConfirm: () => deleteWorldById(world.id)
  });
}

function openWorld(worldId) {
  if (!worldId) return;
  window.location.href = `../world/world.html?worldId=${encodeURIComponent(worldId)}`;
}

function downloadJsonFile(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportWorld(world) {
  if (!isPlainObject(world)) return;

  const filename = `quest4quill-world-${slugifyFileName(getWorldDisplayName(world))}.json`;
  downloadJsonFile(filename, {
    type: WORLD_EXPORT_TYPE,
    version: 1,
    exportedAt: new Date().toISOString(),
    world: cloneData(world)
  });
}

function exportAllWorlds() {
  if (worlds.length === 0) {
    openAppModal({
      title: 'Exportar mundos',
      body: 'No hay mundos para exportar.',
      confirmText: 'Aceptar',
      cancelText: 'Cerrar'
    });
    return;
  }

  const filename = `quest4quill-worlds-${new Date().toISOString().slice(0, 10)}.json`;
  downloadJsonFile(filename, {
    type: WORLD_BUNDLE_TYPE,
    version: 1,
    exportedAt: new Date().toISOString(),
    worlds: worlds.map((world) => cloneData(world))
  });
}

function openImportDialog() {
  if (!worldImportInput) return;
  worldImportInput.value = '';
  worldImportInput.click();
}

function looksLikeWorld(value) {
  if (!isPlainObject(value)) return false;

  return [
    'id',
    'name',
    'stories',
    'notes',
    'characters',
    'organizations',
    'regions',
    'locations',
    'items'
  ].some((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function extractWorldEntries(payload) {
  if (Array.isArray(payload)) {
    return payload.filter(isPlainObject);
  }

  if (!isPlainObject(payload)) {
    return [];
  }

  if (Array.isArray(payload.worlds)) {
    return payload.worlds.filter(isPlainObject);
  }

  if (isPlainObject(payload.world)) {
    return [payload.world];
  }

  if (looksLikeWorld(payload)) {
    return [payload];
  }

  return [];
}

function normalizeImportedWorld(sourceWorld, index) {
  if (!isPlainObject(sourceWorld)) return null;

  const world = cloneData(sourceWorld);
  const name = getWorldDisplayName(world, '');

  world.name = name || `Mundo importado${index > 0 ? ` ${index + 1}` : ''}`;

  const createdAt = Number(world.createdAt);
  world.createdAt = Number.isFinite(createdAt) ? createdAt : Date.now();

  const updatedAt = Number(world.updatedAt);
  world.updatedAt = Number.isFinite(updatedAt) ? updatedAt : world.createdAt;

  return world;
}

function getUniqueWorldId(baseId, reservedIds) {
  const seed = typeof baseId === 'string' && baseId.trim() ? baseId.trim() : `world-${Date.now()}`;
  let candidate = seed;
  let suffix = 2;

  while (reservedIds.has(candidate) || worlds.some((world) => world.id === candidate)) {
    candidate = `${seed}-${suffix}`;
    suffix += 1;
  }

  reservedIds.add(candidate);
  return candidate;
}

async function importWorldsFromFiles(fileList) {
  const files = Array.from(fileList || []);
  if (files.length === 0) return;

  const importedWorlds = [];
  const skippedFiles = [];

  for (const file of files) {
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const entries = extractWorldEntries(parsed);

      if (entries.length === 0) {
        skippedFiles.push(file.name);
        continue;
      }

      entries.forEach((entry, index) => {
        const normalized = normalizeImportedWorld(entry, index);
        if (normalized) {
          importedWorlds.push(normalized);
        }
      });
    } catch (error) {
      skippedFiles.push(file.name);
    }
  }

  if (importedWorlds.length === 0) {
    openAppModal({
      title: 'Importar mundos',
      body: 'No se encontró ningún mundo válido en los archivos seleccionados.',
      confirmText: 'Aceptar',
      cancelText: 'Cerrar'
    });
    return;
  }

  const reservedIds = new Set(worlds.map((world) => world.id));
  const importTime = Date.now();
  let remappedIds = 0;

  const preparedWorlds = importedWorlds.map((world, index) => {
    const nextWorld = cloneData(world);
    const previousId = nextWorld.id;
    nextWorld.id = getUniqueWorldId(nextWorld.id, reservedIds);
    if (nextWorld.id !== previousId) {
      remappedIds += 1;
    }
    nextWorld.updatedAt = importTime - index;
    return nextWorld;
  });

  worlds = [...preparedWorlds, ...worlds];
  saveWorlds();
  renderWorldList();

  const summaryLines = [`Se importaron ${preparedWorlds.length} mundos.`];
  if (skippedFiles.length > 0) {
    summaryLines.push(
      `${skippedFiles.length} archivo(s) se omitieron porque no contenian mundos validos.`
    );
  }
  if (remappedIds > 0) {
    summaryLines.push(`${remappedIds} mundo(s) recibieron un nuevo id para evitar duplicados.`);
  }

  openAppModal({
    title: 'Importación completada',
    body: summaryLines.join('\n'),
    confirmText: 'Aceptar',
    cancelText: 'Cerrar'
  });
}

function setExportButtonState() {
  if (!exportWorldsButton) return;

  exportWorldsButton.disabled = worlds.length === 0;
  exportWorldsButton.title =
    worlds.length === 0 ? 'No hay mundos para exportar' : 'Exportar toda la biblioteca';
}

function renderWorldList() {
  if (!worldList) return;

  worldList.innerHTML = '';

  if (worlds.length === 0) {
    worldList.innerHTML = `
      <div class="empty-state">
        <strong>No hay mundos creados.</strong>
        <p>Usa el botón de abajo para empezar tu primera historia, o importa un archivo JSON si ya tienes uno preparado.</p>
      </div>
    `;
  } else {
    worlds
      .slice()
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .forEach((world) => {
        const card = document.createElement('div');
        card.className = 'world-card';
        card.setAttribute('role', 'button');
        card.tabIndex = 0;

        const worldName = escapeHtml(getWorldDisplayName(world));
        const exportLabel = escapeHtml(`Exportar mundo ${getWorldDisplayName(world)}`);
        const deleteLabel = escapeHtml(`Eliminar mundo ${getWorldDisplayName(world)}`);
        const stats = escapeHtml(getWorldStats(world));
        const updatedAt = escapeHtml(formatDate(world.updatedAt || world.createdAt || Date.now()));

        card.innerHTML = `
          <span class="world-card-copy">
            <strong>${worldName}</strong>
            <span>${stats}</span>
            <small>Actualizado ${updatedAt}</small>
          </span>
          <div class="world-card-actions">
            <button type="button" class="world-export-button" aria-label="${exportLabel}">
              <svg viewBox="0 0 24 24" aria-hidden="true" class="world-export-icon">
                <path d="M12 3v12"></path>
                <path d="M7 10l5 5 5-5"></path>
                <path d="M5 19h14"></path>
              </svg>
            </button>
            <button type="button" class="world-delete-button" aria-label="${deleteLabel}">
              <svg viewBox="0 0 24 24" aria-hidden="true" class="world-delete-icon">
                <path d="M3 6h18"></path>
                <path d="M8 6V4.5C8 3.7 8.7 3 9.5 3h5C15.3 3 16 3.7 16 4.5V6"></path>
                <path d="M6 6l1 13c0 .8.7 1.5 1.5 1.5h7c.8 0 1.5-.7 1.5-1.5l1-13"></path>
                <path d="M10 11v5"></path>
                <path d="M14 11v5"></path>
              </svg>
            </button>
          </div>
        `;

        card.addEventListener('click', () => openWorld(world.id));
        card.addEventListener('keydown', (event) => {
          if (event.target !== card) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openWorld(world.id);
          }
        });

        const exportButton = card.querySelector('.world-export-button');
        exportButton?.addEventListener('click', (event) => {
          event.stopPropagation();
          exportWorld(world);
        });

        const deleteButton = card.querySelector('.world-delete-button');
        deleteButton?.addEventListener('click', (event) => {
          event.stopPropagation();
          confirmDeleteWorld(world);
        });

        worldList.appendChild(card);
      });
  }

  if (newWorldButton) {
    newWorldButton.classList.add('create-world-card');
    newWorldButton.type = 'button';
    newWorldButton.innerHTML = `
      <span class="create-world-icon" aria-hidden="true">
        <span class="create-world-icon-inner">+</span>
      </span>
      <span class="world-card-copy">
        <strong>Crear Nuevo Mundo</strong>
        <span>Empieza una nueva aventura</span>
      </span>
    `;
    worldList.appendChild(newWorldButton);
  }

  setExportButtonState();
}

window.addEventListener('DOMContentLoaded', () => {
  loadWorlds();
  renderWorldList();

  newWorldButton?.addEventListener('click', openNewWorldModal);
  importWorldsButton?.addEventListener('click', openImportDialog);
  exportWorldsButton?.addEventListener('click', exportAllWorlds);
  worldImportInput?.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;

    const files = Array.from(input.files || []);
    input.value = '';
    void importWorldsFromFiles(files);
  });

  modalCancelButton?.addEventListener('click', closeAppModal);
  modalConfirmButton?.addEventListener('click', confirmAppModal);
  appModal?.addEventListener('click', (event) => {
    if (event.target === appModal) {
      closeAppModal();
    }
  });
});
