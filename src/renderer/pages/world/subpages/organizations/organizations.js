const STORAGE_KEY_WORLDS = 'quest4quill_worlds';

const worldTitle = document.getElementById('worldTitle');
const organizationListView = document.getElementById('organizationListView');
const organizationDetailView = document.getElementById('organizationDetailView');
const organizationsGrid = document.getElementById('organizationsGrid');
const deleteOrganizationModal = document.getElementById('deleteOrganizationModal');
const deleteOrganizationModalBody = document.getElementById('deleteOrganizationModalBody');
const deleteOrganizationModalCancel = document.getElementById('deleteOrganizationModalCancel');
const deleteOrganizationModalConfirm = document.getElementById('deleteOrganizationModalConfirm');

let worlds = [];
let selectedOrganizationId = null;
let organizationEditMode = false;
let organizationPendingDeleteId = null;

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

function getOrganizations(world) {
  if (!world) return [];
  if (!Array.isArray(world.organizations)) world.organizations = [];
  return world.organizations;
}

function getRegions(world) {
  if (!world) return [];
  if (!Array.isArray(world.regions)) world.regions = [];
  return world.regions;
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
  const candidates = [entity?.name, entity?.fullName, entity?.title, entity?.alias];
  const value = candidates.find((candidate) => String(candidate || '').trim());
  return String(value || fallback).trim();
}

function getOrganizationName(organization) {
  return getEntityName(organization, 'Organización sin nombre');
}

function getRegionName(region) {
  return getEntityName(region, 'Región sin nombre');
}

function getCharacterName(character) {
  const firstName = String(character?.firstName || '').trim();
  const lastName = String(character?.lastName || '').trim();
  const secondLastName = String(character?.secondLastName || '').trim();
  const combinedName = [firstName, lastName, secondLastName].filter(Boolean).join(' ').trim();
  if (combinedName) return combinedName;
  return String(character?.alias || character?.title || 'Personaje sin nombre').trim();
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

function getSortedOrganizations(world) {
  return getOrganizations(world).slice().sort(compareByOrder);
}

function getSortedRegions(world) {
  return getRegions(world)
    .slice()
    .sort((a, b) => getRegionName(a).localeCompare(getRegionName(b), 'es'));
}

function getSortedCharacters(world) {
  return getCharacters(world)
    .slice()
    .sort((a, b) => getCharacterName(a).localeCompare(getCharacterName(b), 'es'));
}

function normalizeWorldData(world) {
  let changed = false;

  if (!Array.isArray(world.organizations)) {
    world.organizations = [];
    changed = true;
  }

  if (!Array.isArray(world.regions)) {
    world.regions = [];
    changed = true;
  }

  if (!Array.isArray(world.characters)) {
    world.characters = [];
    changed = true;
  }

  const now = Date.now();
  world.organizations.forEach((organization, index) => {
    if (!organization.id) {
      organization.id = `organization-${now}-${index}`;
      changed = true;
    }
  });

  const normalizedOrganizations = normalizeOrderedItems(world.organizations);
  if (
    normalizedOrganizations.length !== world.organizations.length ||
    normalizedOrganizations.some((organization, index) => organization !== world.organizations[index])
  ) {
    changed = true;
  }
  world.organizations = normalizedOrganizations;

  const organizationIds = new Set(world.organizations.map((organization) => organization.id));
  const regionIds = new Set(world.regions.map((region) => region.id));
  const characterIds = new Set(world.characters.map((character) => character.id));

  world.organizations.forEach((organization, index) => {
    if (typeof organization.name !== 'string') {
      organization.name = `Organización ${index + 1}`;
      changed = true;
    }

    if (typeof organization.notes !== 'string') {
      organization.notes = typeof organization.about === 'string' ? organization.about : '';
      changed = true;
    }

    const personnel = Math.max(0, Math.floor(Number(organization.personnel) || 0));
    if (organization.personnel !== personnel) {
      organization.personnel = personnel;
      changed = true;
    }

    changed = setNormalizedArray(
      organization,
      'subsidiaryIds',
      normalizeIdList(organization.subsidiaryIds, organizationIds, organization.id)
    ) || changed;
    changed = setNormalizedArray(
      organization,
      'regionIds',
      normalizeIdList(organization.regionIds, regionIds)
    ) || changed;

    const leaderSeed = toArray(organization.leaderIds);
    if (organization.leaderId) leaderSeed.push(organization.leaderId);

    const leaderIds = normalizeIdList(leaderSeed, characterIds);
    const leaderSet = new Set(leaderIds);
    const subleaderIds = normalizeIdList(organization.subleaderIds, characterIds).filter(
      (characterId) => !leaderSet.has(characterId)
    );
    const subleaderSet = new Set(subleaderIds);
    const memberIds = normalizeIdList(organization.memberIds, characterIds).filter(
      (characterId) => !leaderSet.has(characterId) && !subleaderSet.has(characterId)
    );

    changed = setNormalizedArray(organization, 'leaderIds', leaderIds) || changed;
    changed = setNormalizedArray(organization, 'subleaderIds', subleaderIds) || changed;
    changed = setNormalizedArray(organization, 'memberIds', memberIds) || changed;

    if (!organization.createdAt) {
      organization.createdAt = now;
      changed = true;
    }
    if (!organization.updatedAt) {
      organization.updatedAt = organization.createdAt;
      changed = true;
    }
  });

  return changed;
}

function setUrlOrganizationId(organizationId) {
  const url = new URL(window.location.href);
  if (organizationId) {
    url.searchParams.set('organizationId', organizationId);
  } else {
    url.searchParams.delete('organizationId');
  }
  window.history.replaceState({}, '', url);
}

function getSelectedOrganization(world) {
  const organizations = getOrganizations(world);
  if (organizations.length === 0) return null;

  const fromState = organizations.find((organization) => organization.id === selectedOrganizationId);
  if (fromState) return fromState;

  const fromQuery = new URLSearchParams(window.location.search).get('organizationId');
  const fromUrl = organizations.find((organization) => organization.id === fromQuery);
  if (fromUrl) {
    selectedOrganizationId = fromUrl.id;
    return fromUrl;
  }

  return null;
}

function getNextOrganizationOrder(world) {
  return getOrganizations(world).reduce(
    (highest, organization) => Math.max(highest, getOrderValue(organization)),
    0
  ) + 1;
}

function createOrganization() {
  const world = getCurrentWorld();
  if (!world) return;

  normalizeWorldData(world);

  const organizations = getOrganizations(world);
  const now = Date.now();
  const organization = {
    id: `organization-${now}`,
    name: `Organización ${organizations.length + 1}`,
    notes: '',
    personnel: 0,
    subsidiaryIds: [],
    regionIds: [],
    leaderIds: [],
    subleaderIds: [],
    memberIds: [],
    order: getNextOrganizationOrder(world),
    createdAt: now,
    updatedAt: now
  };

  organizations.push(organization);
  world.updatedAt = now;
  selectedOrganizationId = organization.id;
  organizationEditMode = true;
  saveWorlds();
  setUrlOrganizationId(organization.id);
  render();
}

function updateOrganizationField(organization, field, value) {
  if (field === 'personnel') {
    organization.personnel = Math.max(0, Math.floor(Number(value) || 0));
  } else if (field === 'name') {
    organization.name = String(value).trim() || 'Organización sin nombre';
  } else {
    organization[field] = value;
  }

  organization.updatedAt = Date.now();
  const world = getCurrentWorld();
  if (world) world.updatedAt = organization.updatedAt;
  saveWorlds();
}

function setListMembership(organization, field, itemId, enabled) {
  const values = new Set(toArray(organization[field]));
  if (enabled) {
    values.add(itemId);
  } else {
    values.delete(itemId);
  }

  organization[field] = Array.from(values);
  organization.updatedAt = Date.now();
  const world = getCurrentWorld();
  if (world) {
    world.updatedAt = organization.updatedAt;
    normalizeWorldData(world);
  }
  saveWorlds();
  render();
}

function setCharacterRole(organization, characterId, roleField, enabled) {
  organization.leaderIds = toArray(organization.leaderIds).filter((id) => id !== characterId);
  organization.subleaderIds = toArray(organization.subleaderIds).filter((id) => id !== characterId);
  organization.memberIds = toArray(organization.memberIds).filter((id) => id !== characterId);

  if (enabled && ['leaderIds', 'subleaderIds', 'memberIds'].includes(roleField)) {
    organization[roleField].push(characterId);
  }

  organization.updatedAt = Date.now();
  const world = getCurrentWorld();
  if (world) {
    world.updatedAt = organization.updatedAt;
    normalizeWorldData(world);
  }
  saveWorlds();
  render();
}

function openOrganizationDetail(organizationId) {
  selectedOrganizationId = organizationId;
  organizationEditMode = false;
  setUrlOrganizationId(organizationId);
  render();
}

function showOrganizationList() {
  selectedOrganizationId = null;
  organizationEditMode = false;
  setUrlOrganizationId(null);
  render();
}

function getOrganizationsByIds(world, ids) {
  const byId = new Map(getOrganizations(world).map((organization) => [organization.id, organization]));
  return toArray(ids).map((id) => byId.get(id)).filter(Boolean);
}

function getRegionsByIds(world, ids) {
  const byId = new Map(getRegions(world).map((region) => [region.id, region]));
  return toArray(ids).map((id) => byId.get(id)).filter(Boolean);
}

function getCharactersByIds(world, ids) {
  const byId = new Map(getCharacters(world).map((character) => [character.id, character]));
  return toArray(ids).map((id) => byId.get(id)).filter(Boolean);
}

function getPersonnelText(personnel) {
  const count = Math.max(0, Math.floor(Number(personnel) || 0));
  return `${count} persona${count === 1 ? '' : 's'}`;
}

function renderTagList(items, getLabel, emptyLabel) {
  if (!items.length) return `<span class="organization-empty-text">${escapeHtml(emptyLabel)}</span>`;

  return `
    <div class="organization-tag-list">
      ${items.map((item) => `<span class="organization-tag">${escapeHtml(getLabel(item))}</span>`).join('')}
    </div>
  `;
}

function renderPersonList(characters) {
  if (!characters.length) return '<div class="organization-empty-text">Sin personajes asignados.</div>';

  return `
    <div class="organization-person-list">
      ${characters
        .map(
          (character) => `
            <div class="organization-person-card">${escapeHtml(getCharacterName(character))}</div>
          `
        )
        .join('')}
    </div>
  `;
}

function renderRoleSection(title, characters) {
  return `
    <div class="organization-role-section">
      <div class="organization-role-heading">
        <h4>${escapeHtml(title)}</h4>
        <span>${characters.length}</span>
      </div>
      ${renderPersonList(characters)}
    </div>
  `;
}

function renderCheckList(options, emptyLabel, field) {
  if (!options.length) {
    return `<div class="organization-empty-text">${escapeHtml(emptyLabel)}</div>`;
  }

  return `
    <div class="organization-check-list">
      ${options
        .map(
          (option) => `
            <label class="organization-check-option">
              <input
                type="checkbox"
                ${option.checked ? 'checked' : ''}
                data-toggle-list-field="${escapeHtml(field)}"
                data-item-id="${escapeHtml(option.id)}"
              />
              <span class="organization-check-copy">
                <strong>${escapeHtml(option.label)}</strong>
                ${option.meta ? `<small>${escapeHtml(option.meta)}</small>` : ''}
              </span>
            </label>
          `
        )
        .join('')}
    </div>
  `;
}

function renderMultiSelectTags(items, getLabel, emptyLabel, field) {
  if (!items.length) {
    return `<div class="organization-empty-text">${escapeHtml(emptyLabel)}</div>`;
  }

  return `
    <div class="organization-selected-tags" data-multi-select-tags="${escapeHtml(field)}">
      ${items
        .map(
          (item) => `
            <span class="organization-tag" data-multi-select-id="${escapeHtml(item.id)}">
              ${escapeHtml(getLabel(item))}
              <button type="button" class="tag-remove" data-remove-multi-select-id="${escapeHtml(item.id)}">&times;</button>
            </span>
          `
        )
        .join('')}
    </div>
  `;
}

function renderMultiSelectField({ field, title, placeholder, emptyLabel, items, selectedIds, getLabel }) {
  const inputId = `${field}-input`;
  const panelId = `${field}-panel`;
  const selectedSet = new Set(selectedIds);

  return `
    <div class="organization-edit-section">
      <div class="organization-edit-heading">
        <h4>${escapeHtml(title)}</h4>
        <span>${selectedIds.length}</span>
      </div>
      <div class="organization-multiselect-wrapper">
        <div class="writable-select-shell" data-organization-multi-select>
          <input
            id="${inputId}"
            class="writable-select-input"
            type="text"
            autocomplete="off"
            placeholder="${escapeHtml(placeholder)}"
          />
          <div id="${panelId}" class="writable-select-panel hidden" aria-hidden="true">
            ${
              items.length
                ? items
                    .map((item) => {
                      const checked = selectedSet.has(item.id);
                      return `
                        <button
                          type="button"
                          class="writable-select-option"
                          data-multi-select-option
                          data-multi-select-field="${escapeHtml(field)}"
                          data-item-id="${escapeHtml(item.id)}"
                        >
                          <span>${escapeHtml(getLabel(item))}</span>
                          ${checked ? '<span class="check-mark">✓</span>' : ''}
                        </button>
                      `;
                    })
                    .join('')
                : `<div class="writable-select-empty">${escapeHtml(emptyLabel)}</div>`
            }
          </div>
        </div>
        ${renderMultiSelectTags(
          items.filter((item) => selectedSet.has(item.id)),
          getLabel,
          `Sin ${title.toLowerCase()}.`,
          field
        )}
      </div>
    </div>
  `;
}

function renderRoleCheckList(characters, organization, roleField) {
  if (!characters.length) {
    return '<div class="organization-empty-text">No hay personajes.</div>';
  }

  const selectedIds = toArray(organization[roleField]);
  const fieldId = `organization-${roleField.replace('Ids', '')}`;
  const inputId = `${fieldId}-input`;
  const panelId = `${fieldId}-panel`;
  
  const options = characters.map((character) => ({
    id: character.id,
    label: getCharacterName(character),
    checked: selectedIds.includes(character.id)
  }));

  return `
    <div class="organization-multiselect-wrapper">
      <div class="writable-select-shell" data-writable-select>
        <input
          id="${inputId}"
          class="writable-select-input"
          type="text"
          autocomplete="off"
          placeholder="Buscar personaje..."
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
                        data-role-option="${escapeHtml(roleField)}"
                        data-character-id="${escapeHtml(option.id)}"
                      >
                        <span>${escapeHtml(option.label)}</span>
                        ${option.checked ? '<span class="check-mark">✓</span>' : ''}
                      </button>
                    `
                  )
                  .join('')
              : '<div class="writable-select-empty">No hay personajes disponibles.</div>'
          }
        </div>
      </div>
      <div class="organization-selected-tags" data-role-tags="${escapeHtml(roleField)}">
        ${
          selectedIds.length
            ? selectedIds
                .map((id) => {
                  const char = characters.find((c) => c.id === id);
                  return char
                    ? `<span class="organization-tag" data-character-id="${escapeHtml(id)}">
                        ${escapeHtml(getCharacterName(char))}
                        <button type="button" class="tag-remove" data-remove-character-id="${escapeHtml(id)}">&times;</button>
                      </span>`
                    : '';
                })
                .join('')
            : '<div class="organization-empty-text">No hay personajes seleccionados.</div>'
        }
      </div>
    </div>
  `;
}

function renderOrganizationsList() {
  const world = getCurrentWorld();
  if (!world || !organizationsGrid) return;

  organizationListView?.classList.remove('hidden');
  organizationDetailView?.classList.add('hidden');

  if (worldTitle) worldTitle.textContent = 'Organizaciones';

  const organizations = getSortedOrganizations(world);
  const organizationCards = organizations
    .map((organization) => {
      const subsidiaryCount = toArray(organization.subsidiaryIds).length;
      const namedCharacterCount =
        toArray(organization.leaderIds).length +
        toArray(organization.subleaderIds).length +
        toArray(organization.memberIds).length;

      return `
        <button class="organization-card" type="button" data-organization-id="${escapeHtml(organization.id)}">
          <span class="organization-card-copy">
            <strong>${escapeHtml(getOrganizationName(organization))}</strong>
            <span>${escapeHtml(getPersonnelText(organization.personnel))}</span>
            <small>${subsidiaryCount} subsidiaria${subsidiaryCount === 1 ? '' : 's'} · ${namedCharacterCount} personaje${namedCharacterCount === 1 ? '' : 's'}</small>
          </span>
        </button>
      `;
    })
    .join('');

  organizationsGrid.innerHTML = `
    ${organizationCards}
    <button id="createOrganizationCard" class="create-organization-card" type="button">
      <span class="create-organization-icon" aria-hidden="true">+</span>
      <span class="organization-card-copy">
        <strong>Crear organización</strong>
        <span>Nueva entrada</span>
      </span>
    </button>
  `;

  organizationsGrid.querySelectorAll('[data-organization-id]').forEach((button) => {
    button.addEventListener('click', () => openOrganizationDetail(button.dataset.organizationId));
  });

  document.getElementById('createOrganizationCard')?.addEventListener('click', createOrganization);
}

function renderOrganizationDetail(organization) {
  const world = getCurrentWorld();
  if (!world || !organizationDetailView) return;

  organizationListView?.classList.add('hidden');
  organizationDetailView.classList.remove('hidden');

  const editable = organizationEditMode;
  const allOrganizations = getSortedOrganizations(world).filter((item) => item.id !== organization.id);
  const allRegions = getSortedRegions(world);
  const allCharacters = getSortedCharacters(world);
  const subsidiaries = getOrganizationsByIds(world, organization.subsidiaryIds);
  const regions = getRegionsByIds(world, organization.regionIds);
  const leaders = getCharactersByIds(world, organization.leaderIds);
  const subleaders = getCharactersByIds(world, organization.subleaderIds);
  const members = getCharactersByIds(world, organization.memberIds);
  const notes = String(organization.notes || '').trim();

  organizationDetailView.innerHTML = `
    <div class="organization-detail-header">
      <div class="organization-detail-title">
        <p class="detail-kicker">Organización</p>
        <h2 class="page-title">${escapeHtml(getOrganizationName(organization))}</h2>
      </div>
      <div class="organization-detail-actions">
        <button id="backToOrganizationsButton" class="action-button secondary" type="button">← Organizaciones</button>
        <button id="toggleOrganizationEditButton" class="action-button" type="button">${editable ? 'Hecho' : 'Editar'}</button>
        <button id="deleteOrganizationButton" class="danger-button" type="button">Eliminar organización</button>
      </div>
    </div>

    <div class="organization-main-grid">
      <section class="organization-about-panel">
        <h3>About</h3>
        ${
          editable
            ? `
              <div class="field">
                <label for="organizationNotesInput">Nota</label>
                <textarea id="organizationNotesInput" placeholder="Nota o explicación de la organización">${escapeHtml(organization.notes || '')}</textarea>
              </div>
            `
            : notes
              ? `<div class="organization-about-text">${escapeHtml(notes)}</div>`
              : '<div class="organization-empty-text">Sin nota de organización.</div>'
        }
      </section>

      <aside class="organization-info-panel">
        <h3>Información general</h3>
        ${
          editable
            ? `
              <div class="organization-edit-section">
                <div class="field">
                  <label for="organizationNameInput">Nombre</label>
                  <input id="organizationNameInput" type="text" value="${escapeHtml(getOrganizationName(organization))}" />
                </div>
                <div class="field">
                  <label for="organizationPersonnelInput">Personal</label>
                  <input id="organizationPersonnelInput" type="number" min="0" step="1" value="${escapeHtml(organization.personnel)}" />
                </div>
              </div>

              ${renderMultiSelectField({
                field: 'subsidiaryIds',
                title: 'Subsidiarios',
                placeholder: 'Buscar organización...',
                emptyLabel: 'No hay subsidiarios disponibles.',
                items: allOrganizations,
                selectedIds: toArray(organization.subsidiaryIds),
                getLabel: getOrganizationName
              })}

              ${renderMultiSelectField({
                field: 'regionIds',
                title: 'Opera en',
                placeholder: 'Buscar región...',
                emptyLabel: 'No hay regiones creadas.',
                items: allRegions,
                selectedIds: toArray(organization.regionIds),
                getLabel: getRegionName
              })}
            `
            : `
              <dl class="organization-info-list">
                <div>
                  <dt>Nombre</dt>
                  <dd>${escapeHtml(getOrganizationName(organization))}</dd>
                </div>
                <div>
                  <dt>Personal</dt>
                  <dd>${escapeHtml(getPersonnelText(organization.personnel))}</dd>
                </div>
                <div>
                  <dt>Subsidiarios</dt>
                  <dd>${renderTagList(subsidiaries, getOrganizationName, 'Sin subsidiarios.')}</dd>
                </div>
                <div>
                  <dt>Opera en</dt>
                  <dd>${renderTagList(regions, getRegionName, 'Sin regiones.')}</dd>
                </div>
              </dl>
            `
        }
      </aside>
    </div>

    <div class="organization-divider" aria-hidden="true"></div>

    <section class="organization-roster-panel">
      <h3>Personajes</h3>
      ${
        editable
          ? `
            <div class="organization-role-edit-grid">
              <div class="organization-role-edit-panel">
                <h5>Líderes</h5>
                ${renderRoleCheckList(allCharacters, organization, 'leaderIds')}
              </div>
              <div class="organization-role-edit-panel">
                <h5>Sublíderes</h5>
                ${renderRoleCheckList(allCharacters, organization, 'subleaderIds')}
              </div>
              <div class="organization-role-edit-panel">
                <h5>Miembros</h5>
                ${renderRoleCheckList(allCharacters, organization, 'memberIds')}
              </div>
            </div>
          `
          : `
            ${renderRoleSection('Líderes', leaders)}
            ${renderRoleSection('Sublíderes', subleaders)}
            ${renderRoleSection('Miembros con nombre', members)}
          `
      }
    </section>
  `;

  document.getElementById('backToOrganizationsButton')?.addEventListener('click', showOrganizationList);
  document.getElementById('toggleOrganizationEditButton')?.addEventListener('click', () => {
    organizationEditMode = !organizationEditMode;
    renderOrganizationDetail(organization);
  });
  document.getElementById('deleteOrganizationButton')?.addEventListener('click', () => {
    openDeleteOrganizationModal(organization);
  });

  if (editable) {
    document.getElementById('organizationNameInput')?.addEventListener('input', (event) => {
      updateOrganizationField(organization, 'name', event.target.value);
      const title = organizationDetailView.querySelector('.organization-detail-title .page-title');
      if (title) {
        title.textContent = String(event.target.value).trim() || 'Organización sin nombre';
      }
    });

    document.getElementById('organizationPersonnelInput')?.addEventListener('input', (event) => {
      updateOrganizationField(organization, 'personnel', event.target.value);
    });

    document.getElementById('organizationNotesInput')?.addEventListener('input', (event) => {
      updateOrganizationField(organization, 'notes', event.target.value);
    });

    organizationDetailView.querySelectorAll('[data-organization-multi-select]').forEach((shell) => {
      const input = shell.querySelector('.writable-select-input');
      const panel = shell.querySelector('.writable-select-panel');

      if (!input || !panel) return;

      const updatePanel = () => {
        const searchTerm = String(input.value || '').trim().toLowerCase();
        panel.querySelectorAll('[data-multi-select-option]').forEach((option) => {
          const text = option.textContent.toLowerCase();
          option.style.display = text.includes(searchTerm) ? '' : 'none';
        });
      };

      input.addEventListener('focus', () => {
        updatePanel();
        panel.classList.remove('hidden');
        panel.setAttribute('aria-hidden', 'false');
      });

      input.addEventListener('click', () => {
        updatePanel();
        panel.classList.remove('hidden');
        panel.setAttribute('aria-hidden', 'false');
      });

      input.addEventListener('input', updatePanel);
      input.addEventListener('blur', () => {
        setTimeout(() => {
          panel.classList.add('hidden');
          panel.setAttribute('aria-hidden', 'true');
          input.value = '';
          panel.querySelectorAll('[data-multi-select-option]').forEach((option) => {
            option.style.display = '';
          });
        }, 200);
      });

      panel.addEventListener('mousedown', (event) => {
        event.preventDefault();
      });
    });

    organizationDetailView.querySelectorAll('[data-multi-select-option]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const field = button.dataset.multiSelectField;
        const itemId = button.dataset.itemId;
        const isSelected = toArray(organization[field]).includes(itemId);
        setListMembership(organization, field, itemId, !isSelected);
      });
    });

    organizationDetailView.querySelectorAll('[data-remove-multi-select-id]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const tags = button.closest('[data-multi-select-tags]');
        if (!tags) return;
        setListMembership(organization, tags.dataset.multiSelectTags, button.dataset.removeMultiSelectId, false);
      });
    });

    // Handle role multiselect options
    organizationDetailView.querySelectorAll('[data-role-option]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const roleField = button.dataset.roleOption;
        const characterId = button.dataset.characterId;
        const isSelected = toArray(organization[roleField]).includes(characterId);
        setCharacterRole(organization, characterId, roleField, !isSelected);
      });
    });

    // Handle role tag removal
    organizationDetailView.querySelectorAll('[data-remove-character-id]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        const characterId = btn.dataset.removeCharacterId;
        const tagElement = btn.closest('[data-character-id]');
        if (tagElement) {
          const roleTagsElement = tagElement.closest('[data-role-tags]');
          if (roleTagsElement) {
            const roleField = roleTagsElement.dataset.roleTags;
            setCharacterRole(organization, characterId, roleField, false);
          }
        }
      });
    });

    // Setup writable selects for role inputs
    organizationDetailView.querySelectorAll('[data-writable-select]').forEach((shell) => {
      const input = shell.querySelector('.writable-select-input');
      const panel = shell.querySelector('.writable-select-panel');
      
      if (input && panel) {
        input.addEventListener('input', (event) => {
          const searchTerm = event.target.value.toLowerCase();
          const options = panel.querySelectorAll('[data-role-option]');
          options.forEach((option) => {
            const text = option.textContent.toLowerCase();
            option.style.display = text.includes(searchTerm) ? '' : 'none';
          });
        });

        input.addEventListener('focus', () => {
          panel.classList.remove('hidden');
          panel.setAttribute('aria-hidden', 'false');
        });

        input.addEventListener('blur', () => {
          setTimeout(() => {
            panel.classList.add('hidden');
            panel.setAttribute('aria-hidden', 'true');
            input.value = '';
            const options = panel.querySelectorAll('[data-role-option]');
            options.forEach((option) => {
              option.style.display = '';
            });
          }, 200);
        });
      }
    });
  }
}

function openDeleteOrganizationModal(organization) {
  const world = getCurrentWorld();
  organizationPendingDeleteId = organization.id;

  if (deleteOrganizationModalBody) {
    const subsidiaryParents = getOrganizations(world).filter((item) =>
      toArray(item.subsidiaryIds).includes(organization.id)
    );

    deleteOrganizationModalBody.textContent =
      `¿Seguro que quieres eliminar "${getOrganizationName(organization)}"? Esta acción no se puede deshacer. ` +
      (subsidiaryParents.length
        ? `También se desvinculará de ${subsidiaryParents.length} organización${subsidiaryParents.length === 1 ? '' : 'es'}.`
        : '');
  }

  deleteOrganizationModal?.classList.remove('hidden');
  deleteOrganizationModal?.setAttribute('aria-hidden', 'false');
}

function closeDeleteOrganizationModal() {
  organizationPendingDeleteId = null;
  deleteOrganizationModal?.classList.add('hidden');
  deleteOrganizationModal?.setAttribute('aria-hidden', 'true');
}

function deleteOrganization(organizationId) {
  const world = getCurrentWorld();
  if (!world) return;

  world.organizations = getOrganizations(world)
    .filter((organization) => organization.id !== organizationId)
    .map((organization) => ({
      ...organization,
      subsidiaryIds: toArray(organization.subsidiaryIds).filter((id) => id !== organizationId)
    }));

  world.updatedAt = Date.now();
  if (selectedOrganizationId === organizationId) selectedOrganizationId = null;
  organizationEditMode = false;
  saveWorlds();
  setUrlOrganizationId(selectedOrganizationId);
  closeDeleteOrganizationModal();
  render();
}

function render() {
  const world = getCurrentWorld();
  if (!world) {
    window.location.href = '../../../home/index.html';
    return;
  }

  const normalized = normalizeWorldData(world);
  if (normalized) saveWorlds();

  const selectedOrganization = getSelectedOrganization(world);
  if (selectedOrganization) {
    renderOrganizationDetail(selectedOrganization);
    return;
  }

  organizationEditMode = false;
  renderOrganizationsList();
}

window.addEventListener('DOMContentLoaded', () => {
  loadWorlds();

  deleteOrganizationModalCancel?.addEventListener('click', closeDeleteOrganizationModal);
  deleteOrganizationModalConfirm?.addEventListener('click', () => {
    if (!organizationPendingDeleteId) return;
    deleteOrganization(organizationPendingDeleteId);
  });
  deleteOrganizationModal?.addEventListener('click', (event) => {
    if (event.target === deleteOrganizationModal) {
      closeDeleteOrganizationModal();
    }
  });

  render();
});
