const STORAGE_KEY_WORLDS = 'quest4quill_worlds';

const worldList = document.getElementById('worldList');
const newWorldButton = document.getElementById('newWorldButton');
const appModal = document.getElementById('appModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalCancelButton = document.getElementById('modalCancelButton');
const modalConfirmButton = document.getElementById('modalConfirmButton');

let worlds = [];
let modalConfirmAction = null;
let modalInput = null;

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

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getWorldStats(world) {
  const stories = Array.isArray(world.stories) ? world.stories.length : 0;
  const characters = Array.isArray(world.characters) ? world.characters.length : 0;
  return `${stories} historias · ${characters} personajes`;
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
    notes: '',
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
    body: `¿Seguro que quieres eliminar "${world.name}"? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    cancelText: 'Cancelar',
    onConfirm: () => deleteWorldById(world.id)
  });
}

function openWorld(worldId) {
  window.location.href = `world.html?worldId=${encodeURIComponent(worldId)}`;
}

function renderWorldList() {
  if (!worldList) return;

  worldList.innerHTML = '';

  if (worlds.length === 0) {
    worldList.innerHTML = `
      <div class="empty-state">
        <strong>No hay mundos creados.</strong>
        <p>Usa el botón de abajo para empezar tu primera historia.</p>
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
        card.innerHTML = `
          <span class="world-card-copy">
            <strong>${world.name}</strong>
            <span>${getWorldStats(world)}</span>
            <small>Actualizado ${formatDate(world.updatedAt || world.createdAt || Date.now())}</small>
          </span>
          <button type="button" class="world-delete-button" aria-label="Eliminar mundo ${world.name}">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="world-delete-icon">
              <path d="M3 6h18"></path>
              <path d="M8 6V4.5C8 3.7 8.7 3 9.5 3h5C15.3 3 16 3.7 16 4.5V6"></path>
              <path d="M6 6l1 13c0 .8.7 1.5 1.5 1.5h7c.8 0 1.5-.7 1.5-1.5l1-13"></path>
              <path d="M10 11v5"></path>
              <path d="M14 11v5"></path>
            </svg>
          </button>
        `;

        card.addEventListener('click', () => openWorld(world.id));
        card.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openWorld(world.id);
          }
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
}

window.addEventListener('DOMContentLoaded', () => {
  loadWorlds();
  renderWorldList();

  newWorldButton?.addEventListener('click', openNewWorldModal);
  modalCancelButton?.addEventListener('click', closeAppModal);
  modalConfirmButton?.addEventListener('click', confirmAppModal);
  appModal?.addEventListener('click', (event) => {
    if (event.target === appModal) {
      closeAppModal();
    }
  });
});
