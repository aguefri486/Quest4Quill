const STORAGE_KEY_WORLDS = 'quest4quill_worlds';

const CHARACTER_TYPES = ['principal', 'major', 'minor'];
const CHARACTER_TYPE_LABELS = {
  principal: 'Principal',
  major: 'Mayor',
  minor: 'Menor'
};

const CHARACTER_STATUSES = ['alive', 'unknown', 'injured', 'dead'];
const CHARACTER_STATUS_LABELS = {
  alive: 'Vivo',
  unknown: 'Desconocido',
  injured: 'Herido',
  dead: 'Fallecido'
};

const RELATION_TYPES = ['progenitor', 'descendiente', 'hermano', 'familia', 'amigo', 'amante', 'rival'];
const RELATION_TYPE_LABELS = {
  progenitor: 'Progenitor',
  descendiente: 'Descendiente',
  hermano: 'Hermano/a',
  familia: 'Familia',
  amigo: 'Amigo',
  amante: 'Amante',
  rival: 'Rival'
};

const worldTitle = document.getElementById('worldTitle');
const characterListView = document.getElementById('characterListView');
const characterDetailView = document.getElementById('characterDetailView');
const principalCharacters = document.getElementById('principalCharacters');
const majorCharacters = document.getElementById('majorCharacters');
const minorCharacters = document.getElementById('minorCharacters');
const principalCount = document.getElementById('principalCount');
const majorCount = document.getElementById('majorCount');
const minorCount = document.getElementById('minorCount');
const createCharacterButton = document.getElementById('createCharacterButton');
const deleteCharacterModal = document.getElementById('deleteCharacterModal');
const deleteCharacterModalBody = document.getElementById('deleteCharacterModalBody');
const deleteCharacterModalCancel = document.getElementById('deleteCharacterModalCancel');
const deleteCharacterModalConfirm = document.getElementById('deleteCharacterModalConfirm');
const relationModal = document.getElementById('relationModal');
const relationModalTitle = document.getElementById('relationModalTitle');
const relationModalBody = document.getElementById('relationModalBody');
const relationModalCancel = document.getElementById('relationModalCancel');
const relationModalConfirm = document.getElementById('relationModalConfirm');
const relationModalDelete = document.getElementById('relationModalDelete');

let worlds = [];
let selectedCharacterId = null;
let characterEditMode = false;
let characterPendingDeleteId = null;
let relationModalState = null;
let relationComposerState = null;
let collapsedRelationGroups = new Set();

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

function getCharacters(world) {
  if (!world) return [];
  if (!Array.isArray(world.characters)) world.characters = [];
  return world.characters;
}

function getRegions(world) {
  if (!world) return [];
  if (!Array.isArray(world.regions)) world.regions = [];
  return world.regions;
}

function getOrganizations(world) {
  if (!world) return [];
  if (!Array.isArray(world.organizations)) world.organizations = [];
  return world.organizations;
}

function getItems(world) {
  if (!world) return [];
  if (!Array.isArray(world.items)) world.items = [];
  return world.items;
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

function getEntityName(entity, fallback) {
  const candidates = [entity?.name, entity?.title, entity?.alias];
  const value = candidates.find((candidate) => String(candidate || '').trim());
  return String(value || fallback).trim();
}

function getRegionName(region) {
  return getEntityName(region, 'Región sin nombre');
}

function getItemName(item) {
  return getEntityName(item, 'Objeto sin nombre');
}

function getOrganizationName(organization) {
  return getEntityName(organization, 'Organización sin nombre');
}

function getCharacterTypeLabel(type) {
  return CHARACTER_TYPE_LABELS[type] || CHARACTER_TYPE_LABELS.principal;
}

function getStatusLabel(status) {
  return CHARACTER_STATUS_LABELS[status] || CHARACTER_STATUS_LABELS.alive;
}

function getRelationLabel(type) {
  return RELATION_TYPE_LABELS[type] || RELATION_TYPE_LABELS.familia;
}

function getInverseRelationType(type) {
  if (type === 'progenitor') return 'descendiente';
  if (type === 'descendiente') return 'progenitor';
  if (RELATION_TYPES.includes(type)) return type;
  return 'familia';
}

function getCharacterDisplayName(character) {
  const firstName = String(character?.firstName || '').trim();
  const lastName = String(character?.lastName || '').trim();
  const secondLastName = String(character?.secondLastName || '').trim();
  const combinedName = [firstName, lastName, secondLastName].filter(Boolean).join(' ').trim();
  if (combinedName) return combinedName;
  return String(character?.alias || character?.title || 'Personaje sin nombre').trim();
}

function getCharacterSubtitle(character) {
  const subtitleBits = [String(character?.title || '').trim(), String(character?.alias || '').trim()].filter(Boolean);
  return subtitleBits.join(' · ');
}

function getCharacterSummary(character) {
  const bits = [getCharacterTypeLabel(character.type), getStatusLabel(character.status)];
  if (character.age !== null && character.age !== undefined && character.age !== '') {
    bits.push(`${character.age} años`);
  }
  return bits.join(' · ');
}

function getLeadOrganizations(world, characterId) {
  return getOrganizations(world).filter((organization) => toArray(organization.leaderIds).includes(characterId));
}

function getRegionById(world, regionId) {
  return getRegions(world).find((region) => region.id === regionId) || null;
}

function getItemById(world, itemId) {
  return getItems(world).find((item) => item.id === itemId) || null;
}

function getWritableSelectOptions(items, getLabel) {
  return items.map((item) => ({
    id: item.id,
    label: getLabel(item)
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
                      data-value="${escapeHtml(option.id)}"
                    >
                      <span>${escapeHtml(option.label)}</span>
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
      const option = options.find((item) => item.id === button.dataset.value);
      const optionText = String(option?.label || '').trim().toLowerCase();
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
        input.value = '';
        onPick(value);
        closePanel();
      }
    }
  });

  panel.querySelectorAll('[data-writable-select-option]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.value || '';
      input.value = '';
      onPick(value);
      closePanel();
    });
  });
}

function getCharacterById(world, characterId) {
  return getCharacters(world).find((character) => character.id === characterId) || null;
}

function getRelationTargetLabel(world, relation) {
  const target = getCharacterById(world, relation.targetId);
  return target ? getCharacterDisplayName(target) : 'Personaje eliminado';
}

function getCharacterByType(world, type) {
  return getCharacters(world)
    .filter((character) => character.type === type)
    .sort((a, b) => getCharacterDisplayName(a).localeCompare(getCharacterDisplayName(b), 'es'));
}

function getSelectedCharacter(world) {
  const characters = getCharacters(world);
  if (characters.length === 0) return null;

  const fromState = characters.find((character) => character.id === selectedCharacterId);
  if (fromState) return fromState;

  const fromQuery = new URLSearchParams(window.location.search).get('characterId');
  const fromUrl = characters.find((character) => character.id === fromQuery);
  if (fromUrl) {
    selectedCharacterId = fromUrl.id;
    return fromUrl;
  }

  return null;
}

function setUrlCharacterId(characterId) {
  const url = new URL(window.location.href);
  if (characterId) {
    url.searchParams.set('characterId', characterId);
  } else {
    url.searchParams.delete('characterId');
  }
  window.history.replaceState({}, '', url);
}

function getNextCharacterOrder(world) {
  return getCharacters(world).reduce((highest, character) => Math.max(highest, getOrderValue(character)), 0) + 1;
}

function normalizeRelations(character, validCharacterIds) {
  const sourceRelations = Array.isArray(character.relations) ? character.relations : [];
  const relationMap = new Map();

  sourceRelations.forEach((relation, index) => {
    const targetId = String(relation.targetId || relation.characterId || relation.id || '').trim();
    if (!targetId || targetId === character.id || !validCharacterIds.has(targetId)) return;

    const relationType = RELATION_TYPES.includes(relation.type) ? relation.type : 'familia';
    const note = String(relation.note || '').trim().slice(0, 200);
    const existing = relationMap.get(targetId);
    const nextRelation = {
      id: existing?.id || relation.id || `relation-${character.id}-${targetId}-${index}`,
      targetId,
      type: relationType,
      note,
      createdAt: existing?.createdAt || relation.createdAt || Date.now(),
      updatedAt: Date.now()
    };
    relationMap.set(targetId, nextRelation);
  });

  const relations = Array.from(relationMap.values());
  const progenitors = relations.filter((relation) => relation.type === 'progenitor');
  if (progenitors.length > 2) {
    const allowed = new Set(progenitors.slice(0, 2).map((relation) => relation.targetId));
    return relations.filter((relation) => relation.type !== 'progenitor' || allowed.has(relation.targetId));
  }

  return relations;
}

function getCharacterRelation(character, targetId) {
  return toArray(character?.relations).find((relation) => relation.targetId === targetId) || null;
}

function syncBidirectionalRelations(world) {
  const characters = getCharacters(world);
  const characterById = new Map(characters.map((character) => [character.id, character]));
  const pairMap = new Map();
  let changed = false;

  characters.forEach((character) => {
    const currentRelations = Array.isArray(character.relations) ? character.relations : [];
    const nextRelations = [];

    currentRelations.forEach((relation) => {
      const sourceId = character.id;
      const targetId = String(relation.targetId || '').trim();
      if (!targetId || targetId === sourceId || !characterById.has(targetId)) {
        return;
      }

      const relationType = RELATION_TYPES.includes(relation.type) ? relation.type : 'familia';
      const relationNote = String(relation.note || '').trim().slice(0, 200);
      const normalizedRelation = {
        id: relation.id || `relation-${sourceId}-${targetId}`,
        targetId,
        type: relationType,
        note: relationNote,
        createdAt: relation.createdAt || Date.now(),
        updatedAt: relation.updatedAt || Date.now()
      };
      nextRelations.push(normalizedRelation);

      const pairKey = [sourceId, targetId].sort().join('::');
      const existingPair = pairMap.get(pairKey) || {
        sourceId: [sourceId, targetId].sort()[0],
        targetId: [sourceId, targetId].sort()[1],
        relations: new Map()
      };
      existingPair.relations.set(sourceId, normalizedRelation);
      pairMap.set(pairKey, existingPair);
    });

    const nextSignature = nextRelations
      .map((relation) => [relation.targetId, relation.type, String(relation.note || '')].join('|'))
      .sort();
    const currentSignature = currentRelations
      .map((relation) => [String(relation.targetId || ''), String(relation.type || ''), String(relation.note || '')].join('|'))
      .sort();

    if (!areEqualArrays(nextSignature, currentSignature)) {
      changed = true;
    }

    character.relations = nextRelations;
  });

  pairMap.forEach((pair) => {
    const firstId = pair.sourceId;
    const secondId = pair.targetId;
    const firstRelation = pair.relations.get(firstId) || null;
    const secondRelation = pair.relations.get(secondId) || null;

    const firstNote = String(firstRelation?.note || '').trim();
    const secondNote = String(secondRelation?.note || '').trim();
    let noteOwnerId = null;

    if (firstNote && secondNote) {
      noteOwnerId =
        (Number(secondRelation?.updatedAt) || 0) > (Number(firstRelation?.updatedAt) || 0)
          ? secondId
          : firstId;
    } else if (firstNote) {
      noteOwnerId = firstId;
    } else if (secondNote) {
      noteOwnerId = secondId;
    }

    const buildRelation = (sourceId, targetId, sourceRelation, otherRelation) => {
      const sourceCharacter = characterById.get(sourceId);
      if (!sourceCharacter) return null;

      const relationType = sourceRelation?.type || (otherRelation ? getInverseRelationType(otherRelation.type) : 'familia');
      const normalizedType = RELATION_TYPES.includes(relationType) ? relationType : 'familia';
      return {
        id: sourceRelation?.id || `relation-${sourceId}-${targetId}`,
        targetId,
        type: normalizedType,
        note: noteOwnerId === sourceId ? String(sourceRelation?.note || '').trim().slice(0, 200) : '',
        createdAt: sourceRelation?.createdAt || otherRelation?.createdAt || Date.now(),
        updatedAt: Date.now()
      };
    };

    const firstNext = buildRelation(firstId, secondId, firstRelation, secondRelation);
    const secondNext = buildRelation(secondId, firstId, secondRelation, firstRelation);
    const firstCharacter = characterById.get(firstId);
    const secondCharacter = characterById.get(secondId);

    if (firstCharacter && firstNext) {
      const currentRelation = getCharacterRelation(firstCharacter, secondId);
      const nextSignature = [firstNext.targetId, firstNext.type, firstNext.note].join('|');
      const currentSignature = currentRelation
        ? [currentRelation.targetId, currentRelation.type, String(currentRelation.note || '')].join('|')
        : '';
      if (nextSignature !== currentSignature) changed = true;
      firstCharacter.relations = toArray(firstCharacter.relations).filter((relation) => relation.targetId !== secondId).concat(firstNext);
    }

    if (secondCharacter && secondNext) {
      const currentRelation = getCharacterRelation(secondCharacter, firstId);
      const nextSignature = [secondNext.targetId, secondNext.type, secondNext.note].join('|');
      const currentSignature = currentRelation
        ? [currentRelation.targetId, currentRelation.type, String(currentRelation.note || '')].join('|')
        : '';
      if (nextSignature !== currentSignature) changed = true;
      secondCharacter.relations = toArray(secondCharacter.relations).filter((relation) => relation.targetId !== firstId).concat(secondNext);
    }
  });

  return changed;
}

function getRelationSignature(relation) {
  return [
    String(relation?.targetId || ''),
    String(relation?.type || ''),
    String(relation?.note || '')
  ].join('|');
}

function normalizeCharacter(character, index, validRegionIds, validItemIds, validCharacterIds) {
  let changed = false;

  if (typeof character.id !== 'string' || !character.id) {
    character.id = `character-${Date.now()}-${index}`;
    changed = true;
  }

  if (!CHARACTER_TYPES.includes(character.type)) {
    character.type = 'principal';
    changed = true;
  }

  if (!CHARACTER_STATUSES.includes(character.status)) {
    character.status = 'alive';
    changed = true;
  }

  const firstName = String(character.firstName || '').trim();
  if (character.firstName !== firstName) {
    character.firstName = firstName;
    changed = true;
  }
  if (!character.firstName) {
    character.firstName = `Personaje ${index + 1}`;
    changed = true;
  }

  const lastName = String(character.lastName || '').trim();
  if (character.lastName !== lastName) {
    character.lastName = lastName;
    changed = true;
  }

  const secondLastName = String(character.secondLastName || '').trim();
  if (character.secondLastName !== secondLastName) {
    character.secondLastName = secondLastName;
    changed = true;
  }

  const title = String(character.title || '').trim();
  if (character.title !== title) {
    character.title = title;
    changed = true;
  }

  const alias = String(character.alias || '').trim();
  if (character.alias !== alias) {
    character.alias = alias;
    changed = true;
  }

  const gender = String(character.gender || '').trim();
  if (character.gender !== gender) {
    character.gender = gender;
    changed = true;
  }

  const age = character.age === '' || character.age === null || character.age === undefined
    ? null
    : Math.max(0, Math.floor(Number(character.age) || 0));
  if (character.age !== age) {
    character.age = age;
    changed = true;
  }

  const birthRegionId = validRegionIds.has(String(character.birthRegionId || ''))
    ? String(character.birthRegionId)
    : null;
  if (character.birthRegionId !== birthRegionId) {
    character.birthRegionId = birthRegionId;
    changed = true;
  }

  changed = setNormalizedArray(
    character,
    'residenceRegionIds',
    normalizeIdList(character.residenceRegionIds, validRegionIds)
  ) || changed;

  changed = setNormalizedArray(
    character,
    'itemIds',
    normalizeIdList(character.itemIds, validItemIds)
  ) || changed;

  const notes = String(character.notes || '').trim();
  if (character.notes !== notes) {
    character.notes = notes;
    changed = true;
  }

  const description = String(character.description || '').trim();
  if (character.description !== description) {
    character.description = description;
    changed = true;
  }

  const motivations = String(character.motivations || '').trim();
  if (character.motivations !== motivations) {
    character.motivations = motivations;
    changed = true;
  }

  const personality = String(character.personality || '').trim();
  if (character.personality !== personality) {
    character.personality = personality;
    changed = true;
  }

  const relations = normalizeRelations(character, validCharacterIds);
  const currentRelationSignatures = toArray(character.relations).map(getRelationSignature).sort();
  const nextRelationSignatures = relations.map(getRelationSignature).sort();
  if (!areEqualArrays(currentRelationSignatures, nextRelationSignatures)) {
    changed = true;
  }
  character.relations = relations;

  if (!character.createdAt) {
    character.createdAt = Date.now();
    changed = true;
  }
  if (!character.updatedAt) {
    character.updatedAt = character.createdAt;
    changed = true;
  }

  return changed;
}

function syncItemHoldings(world) {
  const characters = getCharacters(world);
  const items = getItems(world);
  const characterById = new Map(characters.map((character) => [character.id, character]));
  const itemById = new Map(items.map((item) => [item.id, item]));
  let changed = false;

  characters.forEach((character) => {
    const nextItemIds = toArray(character.itemIds).filter((itemId) => itemById.has(itemId));
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

  if (!Array.isArray(world.characters)) {
    world.characters = [];
    changed = true;
  }

  if (!Array.isArray(world.regions)) {
    world.regions = [];
    changed = true;
  }

  if (!Array.isArray(world.organizations)) {
    world.organizations = [];
    changed = true;
  }

  if (!Array.isArray(world.items)) {
    world.items = [];
    changed = true;
  }

  const normalizedCharacters = normalizeOrderedItems(world.characters);
  if (
    normalizedCharacters.length !== world.characters.length ||
    normalizedCharacters.some((character, index) => character !== world.characters[index])
  ) {
    changed = true;
  }
  world.characters = normalizedCharacters;

  const regionIds = new Set(world.regions.map((region) => region.id));
  const itemIds = new Set(world.items.map((item) => item.id));
  const characterIds = new Set(world.characters.map((character) => character.id));

  world.characters.forEach((character, index) => {
    changed = normalizeCharacter(character, index, regionIds, itemIds, characterIds) || changed;
  });

  changed = syncItemHoldings(world) || changed;
  changed = syncBidirectionalRelations(world) || changed;

  world.organizations.forEach((organization, index) => {
    if (!organization.id) {
      organization.id = `organization-${Date.now()}-${index}`;
      changed = true;
    }
    if (typeof organization.name !== 'string') {
      organization.name = `Organización ${index + 1}`;
      changed = true;
    }
    if (!Array.isArray(organization.leaderIds)) {
      organization.leaderIds = [];
      changed = true;
    }
    if (!Array.isArray(organization.subleaderIds)) {
      organization.subleaderIds = [];
      changed = true;
    }
    if (!Array.isArray(organization.memberIds)) {
      organization.memberIds = [];
      changed = true;
    }
    if (!Array.isArray(organization.subsidiaryIds)) {
      organization.subsidiaryIds = [];
      changed = true;
    }
    if (!Array.isArray(organization.regionIds)) {
      organization.regionIds = [];
      changed = true;
    }

    const leaderIds = normalizeIdList(organization.leaderIds, characterIds);
    if (!areEqualArrays(leaderIds, organization.leaderIds)) changed = true;
    organization.leaderIds = leaderIds;
    organization.subleaderIds = normalizeIdList(organization.subleaderIds, characterIds).filter((id) => !leaderIds.includes(id));
    organization.memberIds = normalizeIdList(organization.memberIds, characterIds).filter(
      (id) => !leaderIds.includes(id) && !organization.subleaderIds.includes(id)
    );
    organization.subsidiaryIds = normalizeIdList(organization.subsidiaryIds, new Set(world.organizations.map((item) => item.id)), organization.id);
    organization.regionIds = normalizeIdList(organization.regionIds, regionIds);
  });

  return changed;
}

function setCharacterField(character, field, value) {
  if (!character) return;

  if (field === 'age') {
    character.age = value === '' ? null : Math.max(0, Math.floor(Number(value) || 0));
  } else if (field === 'birthRegionId') {
    character.birthRegionId = String(value || '') || null;
  } else if (field === 'name') {
    character.firstName = String(value).trim() || 'Personaje sin nombre';
  } else {
    character[field] = value;
  }

  character.updatedAt = Date.now();
  const world = getCurrentWorld();
  if (world) world.updatedAt = character.updatedAt;
  saveWorlds();
}

function setCharacterType(character, type) {
  if (!character || !CHARACTER_TYPES.includes(type)) return;
  character.type = type;
  character.updatedAt = Date.now();
  const world = getCurrentWorld();
  if (world) world.updatedAt = character.updatedAt;
  saveWorlds();
}

function setCharacterStatus(character, status) {
  if (!character || !CHARACTER_STATUSES.includes(status)) return;
  character.status = status;
  character.updatedAt = Date.now();
  const world = getCurrentWorld();
  if (world) world.updatedAt = character.updatedAt;
  saveWorlds();
}

function setCharacterRelationFields(character, fields) {
  if (!character) return;
  character.relations = fields;
  character.updatedAt = Date.now();
  const world = getCurrentWorld();
  if (world) {
    world.updatedAt = character.updatedAt;
    normalizeWorldData(world);
  }
  saveWorlds();
}

function setCharacterListField(character, field, values) {
  if (!character) return;

  character[field] = Array.from(new Set(toArray(values).filter(Boolean)));
  character.updatedAt = Date.now();
  const world = getCurrentWorld();
  if (world) world.updatedAt = character.updatedAt;
  saveWorlds();
}

function addCharacterListValue(character, field, value) {
  const currentValues = toArray(character?.[field]);
  if (!value || currentValues.includes(value)) return;

  setCharacterListField(character, field, [...currentValues, value]);
  render();
}

function removeCharacterListValue(character, field, value) {
  const nextValues = toArray(character?.[field]).filter((id) => id !== value);
  setCharacterListField(character, field, nextValues);
  render();
}

function toggleCharacterEditMode() {
  characterEditMode = !characterEditMode;
  if (!characterEditMode) {
    closeRelationComposer();
  }
  closeRelationModal();
  render();
}

function showCharacterList() {
  selectedCharacterId = null;
  characterEditMode = false;
  closeRelationComposer();
  closeRelationModal();
  setUrlCharacterId(null);
  render();
}

function openCharacterDetail(characterId) {
  selectedCharacterId = characterId;
  characterEditMode = false;
  closeRelationComposer();
  closeRelationModal();
  setUrlCharacterId(characterId);
  render();
}

function createCharacter() {
  const world = getCurrentWorld();
  if (!world) return;

  normalizeWorldData(world);

  const now = Date.now();
  const characters = getCharacters(world);
  const character = {
    id: `character-${now}`,
    type: 'principal',
    status: 'alive',
    firstName: `Personaje ${characters.length + 1}`,
    lastName: '',
    secondLastName: '',
    title: '',
    alias: '',
    gender: '',
    age: null,
    birthRegionId: null,
    residenceRegionIds: [],
    itemIds: [],
    notes: '',
    description: '',
    motivations: '',
    personality: '',
    relations: [],
    order: getNextCharacterOrder(world),
    createdAt: now,
    updatedAt: now
  };

  characters.push(character);
  world.updatedAt = now;
  selectedCharacterId = character.id;
  characterEditMode = true;
  saveWorlds();
  setUrlCharacterId(character.id);
  render();
}

function deleteCharacter(characterId) {
  const world = getCurrentWorld();
  if (!world) return;

  world.characters = getCharacters(world).filter((character) => character.id !== characterId);

  getOrganizations(world).forEach((organization) => {
    organization.leaderIds = toArray(organization.leaderIds).filter((id) => id !== characterId);
    organization.subleaderIds = toArray(organization.subleaderIds).filter((id) => id !== characterId);
    organization.memberIds = toArray(organization.memberIds).filter((id) => id !== characterId);
  });

  world.characters.forEach((character) => {
    character.relations = toArray(character.relations).filter((relation) => relation.targetId !== characterId);
  });

  world.updatedAt = Date.now();
  if (selectedCharacterId === characterId) selectedCharacterId = null;
  characterEditMode = false;
  saveWorlds();
  setUrlCharacterId(selectedCharacterId);
  closeDeleteCharacterModal();
  render();
}

function openDeleteCharacterModal(character) {
  characterPendingDeleteId = character.id;
  if (deleteCharacterModalBody) {
    deleteCharacterModalBody.textContent = `¿Seguro que quieres eliminar "${getCharacterDisplayName(character)}"? Esta acción no se puede deshacer.`;
  }
  deleteCharacterModal?.classList.remove('hidden');
  deleteCharacterModal?.setAttribute('aria-hidden', 'false');
}

function closeDeleteCharacterModal() {
  characterPendingDeleteId = null;
  deleteCharacterModal?.classList.add('hidden');
  deleteCharacterModal?.setAttribute('aria-hidden', 'true');
}

function addRelation(character, targetId, type, note) {
  const world = getCurrentWorld();
  if (!world || !character) return;

  const targetCharacter = getCharacterById(world, targetId);
  if (!targetCharacter || targetCharacter.id === character.id) return;
  if (!RELATION_TYPES.includes(type)) return;

  const relationNote = String(note || '').trim().slice(0, 200);
  const existingRelation = toArray(character.relations).find((relation) => relation.targetId === targetId);
  const existingIsProgenitor = existingRelation?.type === 'progenitor';
  const currentProgenitors = toArray(character.relations).filter((relation) => relation.type === 'progenitor');

  if (type === 'progenitor' && !existingIsProgenitor && currentProgenitors.length >= 2) {
    const message = document.getElementById('relationComposerMessage');
    if (message) {
      message.textContent = 'Máximo 2 progenitores por personaje.';
    }
    return;
  }

  const nextRelations = toArray(character.relations).filter((relation) => relation.targetId !== targetId);
  nextRelations.push({
    id: existingRelation?.id || `relation-${character.id}-${targetId}-${Date.now()}`,
    targetId,
    type,
    note: relationNote,
    createdAt: existingRelation?.createdAt || Date.now(),
    updatedAt: Date.now()
  });

  setCharacterRelationFields(character, nextRelations);
  render();
}

function updateRelation(character, targetId, updates) {
  const world = getCurrentWorld();
  if (!world || !character) return;

  const targetCharacter = getCharacterById(world, targetId);
  const currentRelations = toArray(character.relations);
  const relationIndex = currentRelations.findIndex((relation) => relation.targetId === targetId);
  if (relationIndex < 0) return;

  const currentRelation = currentRelations[relationIndex];
  const now = Date.now();
  const nextType = RELATION_TYPES.includes(updates?.type) ? updates.type : currentRelation.type;
  const nextNote = String(updates?.note ?? currentRelation.note ?? '').trim().slice(0, 200);

  currentRelations[relationIndex] = {
    ...currentRelation,
    type: nextType,
    note: nextNote,
    updatedAt: now
  };

  character.relations = currentRelations;
  character.updatedAt = now;

  if (targetCharacter) {
    const reverseRelations = toArray(targetCharacter.relations);
    const reverseIndex = reverseRelations.findIndex((relation) => relation.targetId === character.id);
    const inverseType = getInverseRelationType(nextType);

    if (reverseIndex >= 0) {
      reverseRelations[reverseIndex] = {
        ...reverseRelations[reverseIndex],
        type: inverseType,
        note: '',
        updatedAt: now
      };
    } else {
      reverseRelations.push({
        id: `relation-${targetCharacter.id}-${character.id}-${now}`,
        targetId: character.id,
        type: inverseType,
        note: '',
        createdAt: now,
        updatedAt: now
      });
    }

    targetCharacter.relations = reverseRelations;
    targetCharacter.updatedAt = now;
  }

  world.updatedAt = now;
  normalizeWorldData(world);
  saveWorlds();

  if (updates?.rerender !== false) {
    render();
  }
}

function removeRelation(character, targetId) {
  const world = getCurrentWorld();
  if (!world || !character) return;

  const targetCharacter = getCharacterById(world, targetId);
  const now = Date.now();
  character.relations = toArray(character.relations).filter((relation) => relation.targetId !== targetId);
  character.updatedAt = now;

  if (targetCharacter) {
    targetCharacter.relations = toArray(targetCharacter.relations).filter((relation) => relation.targetId !== character.id);
    targetCharacter.updatedAt = now;
  }

  world.updatedAt = now;
  normalizeWorldData(world);
  saveWorlds();

  render();
}

function openCharacterFromRelation(targetId) {
  if (!targetId) return;
  openCharacterDetail(targetId);
}

function closeRelationComposer() {
  relationComposerState = null;
}

function closeRelationModal() {
  relationModalState = null;
  if (relationModal) {
    relationModal.classList.remove('relation-view');
    relationModal.classList.add('hidden');
    relationModal.setAttribute('aria-hidden', 'true');
  }
}

function openRelationModal(character, targetId, mode = 'view') {
  if (mode === 'edit') {
    closeRelationModal();
    relationComposerState = {
      characterId: character.id,
      targetId
    };
    renderCharacterDetail(character);
    return;
  }

  const world = getCurrentWorld();
  if (!world || !character || !targetId) return;

  const targetCharacter = getCharacterById(world, targetId);
  const relation = getCharacterRelation(character, targetId);
  if (!targetCharacter || !relation) return;

  relationModalState = { characterId: character.id, targetId, mode };
  const targetName = getCharacterDisplayName(targetCharacter);
  const relationType = relation.type;
  const relationNote = String(relation.note || '').trim();
  const relationTypeOptions = RELATION_TYPES
    .map(
      (type) => `
        <option value="${type}" ${type === relationType ? 'selected' : ''}>${escapeHtml(getRelationLabel(type))}</option>
      `
    )
    .join('');

  if (relationModalTitle) {
    // In view mode we hide the header entirely; in edit mode show the full title
    relationModalTitle.textContent = mode === 'edit' ? `Editar relación con ${targetName}` : '';
  }

  if (relationModalBody) {
    relationModalBody.innerHTML =
      mode === 'edit'
        ? `
          <div class="relation-modal-grid">
            <div class="relation-modal-form">
              <div class="field">
                <label for="relationModalTypeSelect">Relación</label>
                <select id="relationModalTypeSelect" class="character-relation-select">
                  ${relationTypeOptions}
                </select>
              </div>
              <div class="field">
                <label for="relationModalNoteInput">Nota</label>
                <textarea id="relationModalNoteInput" class="character-relation-notes" maxlength="200" placeholder="Texto guardado de la relación">${escapeHtml(relationNote)}</textarea>
              </div>
            </div>
            <aside class="relation-modal-preview">
              <div class="relation-modal-preview-label">Vista previa</div>
              <strong>${escapeHtml(targetName)}</strong>
              <small>${escapeHtml(getRelationLabel(relationType))}</small>
              <div class="relation-modal-preview-note">${relationNote ? escapeHtml(relationNote) : 'Sin nota guardada.'}</div>
            </aside>
          </div>
        `
        : `
          <div class="relation-modal-view relation-modal-view-compact">
            <div class="relation-modal-view-note">${relationNote ? escapeHtml(relationNote) : 'Sin nota guardada.'}</div>
          </div>
        `;
  }

  if (relationModalConfirm) {
    relationModalConfirm.textContent = mode === 'edit' ? 'Guardar' : 'Cerrar';
    relationModalConfirm.classList.toggle('hidden', mode !== 'edit');
  }
  if (relationModalCancel) {
    relationModalCancel.textContent = mode === 'edit' ? 'Cancelar' : 'Cerrar';
  }
  if (relationModalDelete) {
    relationModalDelete.classList.toggle('hidden', mode !== 'edit');
  }

  // Toggle a class on the overlay so we can apply view-mode specific CSS
  if (relationModal) {
    relationModal.classList.toggle('relation-view', mode === 'view');
    relationModal.classList.remove('hidden');
    relationModal.setAttribute('aria-hidden', 'false');
  }
}

function saveOpenRelationModal() {
  if (!relationModalState || relationModalState.mode !== 'edit') {
    closeRelationModal();
    return;
  }

  const world = getCurrentWorld();
  if (!world) return;

  const character = getCharacterById(world, relationModalState.characterId);
  if (!character) return;

  const typeSelect = document.getElementById('relationModalTypeSelect');
  const noteInput = document.getElementById('relationModalNoteInput');
  updateRelation(character, relationModalState.targetId, {
    type: typeSelect?.value || 'familia',
    note: noteInput?.value || ''
  });
  closeRelationModal();
}

function deleteOpenRelation() {
  if (!relationModalState) return;
  const world = getCurrentWorld();
  if (!world) return;
  const character = getCharacterById(world, relationModalState.characterId);
  if (!character) return;
  removeRelation(character, relationModalState.targetId);
  closeRelationModal();
}

function getRelationSections(character) {
  const relations = toArray(character.relations);
  return RELATION_TYPES.map((type) => ({
    type,
    label: getRelationLabel(type),
    relations: relations.filter((relation) => relation.type === type)
  }));
}

function renderCharacterCard(character) {
  const displayName = getCharacterDisplayName(character);
  const subtitle = getCharacterSubtitle(character);

  return `
    <button class="character-card" type="button" data-character-id="${escapeHtml(character.id)}">
      <span class="character-card-copy">
        <strong>${escapeHtml(displayName)}</strong>
        <span>${escapeHtml(getCharacterSummary(character))}</span>
        ${subtitle ? `<small>${escapeHtml(subtitle)}</small>` : ''}
      </span>
    </button>
  `;
}

function renderCharacterLists() {
  const world = getCurrentWorld();
  if (!world || !principalCharacters || !majorCharacters || !minorCharacters) return;

  characterListView?.classList.remove('hidden');
  characterDetailView?.classList.add('hidden');

  const principal = getCharacterByType(world, 'principal');
  const major = getCharacterByType(world, 'major');
  const minor = getCharacterByType(world, 'minor');

  if (worldTitle) worldTitle.textContent = 'Personajes';
  if (principalCount) principalCount.textContent = String(principal.length);
  if (majorCount) majorCount.textContent = String(major.length);
  if (minorCount) minorCount.textContent = String(minor.length);

  principalCharacters.innerHTML = principal.length
    ? principal.map((character) => renderCharacterCard(character)).join('')
    : '<div class="character-empty-text">No hay personajes principales todavía.</div>';
  majorCharacters.innerHTML = major.length
    ? major.map((character) => renderCharacterCard(character)).join('')
    : '<div class="character-empty-text">No hay personajes mayores todavía.</div>';
  minorCharacters.innerHTML = minor.length
    ? minor.map((character) => renderCharacterCard(character)).join('')
    : '<div class="character-empty-text">No hay personajes menores todavía.</div>';

  principalCharacters.querySelectorAll('[data-character-id]').forEach((button) => {
    button.addEventListener('click', () => openCharacterDetail(button.dataset.characterId));
  });
  majorCharacters.querySelectorAll('[data-character-id]').forEach((button) => {
    button.addEventListener('click', () => openCharacterDetail(button.dataset.characterId));
  });
  minorCharacters.querySelectorAll('[data-character-id]').forEach((button) => {
    button.addEventListener('click', () => openCharacterDetail(button.dataset.characterId));
  });
}

function renderTypeButtons(character, editable) {
  return `
    <div class="character-type-selector">
      ${CHARACTER_TYPES.map((type) => `
        <label class="character-type-option">
          <input type="radio" name="characterType" value="${type}" ${character.type === type ? 'checked' : ''} ${editable ? '' : 'disabled'} />
          <span>${escapeHtml(getCharacterTypeLabel(type))}</span>
        </label>
      `).join('')}
    </div>
  `;
}

function renderReadOnlyField(label, value, fallback = 'Sin definir', className = '') {
  return `
    <div class="character-info-item ${className}">
      <label>${escapeHtml(label)}</label>
      <div class="value">${escapeHtml(value || fallback)}</div>
    </div>
  `;
}

function renderSelectOptions(options, selectedId, emptyLabel = 'Sin opciones') {
  if (!options.length) {
    return `<option value="">${escapeHtml(emptyLabel)}</option>`;
  }

  return `
    <option value="">Selecciona una opción</option>
    ${options.map((option) => `<option value="${escapeHtml(option.id)}" ${option.id === selectedId ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
  `;
}

function renderMultiSelectOptions(options, selectedIds) {
  const selectedSet = new Set(selectedIds);
  return options
    .map((option) => `<option value="${escapeHtml(option.id)}" ${selectedSet.has(option.id) ? 'selected' : ''}>${escapeHtml(option.label)}</option>`)
    .join('');
}

function renderChipList(items, getLabel, emptyLabel) {
  if (!items.length) {
    return `<div class="character-empty-text">${escapeHtml(emptyLabel)}</div>`;
  }

  return `
    <div class="character-badge-list">
      ${items.map((item) => `<span class="character-badge">${escapeHtml(getLabel(item))}</span>`).join('')}
    </div>
  `;
}

function renderTagList(items, getLabel, emptyLabel, removeAttr) {
  if (!items.length) {
    return `<div class="character-empty-inline">${escapeHtml(emptyLabel)}</div>`;
  }

  return `
    <div class="character-tag-list">
      ${items
        .map(
          (item) => `
            <button class="character-tag" type="button" ${removeAttr}="${escapeHtml(item.id)}">
              <span>${escapeHtml(getLabel(item))}</span>
              <span class="character-tag-close" aria-hidden="true">×</span>
            </button>
          `
        )
        .join('')}
    </div>
  `;
}

function renderRelationComposer(character, world) {
  const editingRelation =
    relationComposerState?.characterId === character.id
      ? getCharacterRelation(character, relationComposerState.targetId)
      : null;
  const isEditing = Boolean(editingRelation);
  const selectedTargetId = editingRelation?.targetId || '';
  const selectedType = editingRelation?.type || 'familia';
  const selectedNote = String(editingRelation?.note || '');
  const availableCharacters = getCharacters(world).filter((otherCharacter) => otherCharacter.id !== character.id);
  const progenitorCount = toArray(character.relations).filter((relation) => relation.type === 'progenitor').length;
  const canUseProgenitor = isEditing && editingRelation?.type === 'progenitor' ? true : progenitorCount < 2;
  const selectedTargetCharacter = selectedTargetId ? getCharacterById(world, selectedTargetId) : null;
  const relationTargetLabel = selectedTargetCharacter ? getCharacterDisplayName(selectedTargetCharacter) : '';

  return `
    <div class="character-relation-composer ${isEditing ? 'character-relation-composer-editing' : ''}">
      <div class="character-panel-title">
        <h4>${escapeHtml(isEditing ? 'Editar relación' : 'Añadir relación')}</h4>
        <span>${escapeHtml(isEditing && relationTargetLabel ? relationTargetLabel : 'Nueva')}</span>
      </div>
      <div class="character-relation-grid">
        <div class="field">
          <label for="relationTargetSelect">Personaje</label>
          <select id="relationTargetSelect" class="character-relation-select">
            <option value="">Selecciona un personaje</option>
            ${availableCharacters
              .map(
                (otherCharacter) => `
                  <option value="${escapeHtml(otherCharacter.id)}" ${selectedTargetId === otherCharacter.id ? 'selected' : ''}>
                    ${escapeHtml(getCharacterDisplayName(otherCharacter))}
                  </option>
                `
              )
              .join('')}
          </select>
        </div>
        <div class="field">
          <label for="relationTypeSelect">Relación</label>
          <select id="relationTypeSelect" class="character-relation-select">
            ${RELATION_TYPES.map(
              (type) => `
                <option
                  value="${type}"
                  ${selectedType === type ? 'selected' : ''}
                  ${type === 'progenitor' && !canUseProgenitor ? 'disabled' : ''}
                >
                  ${escapeHtml(getRelationLabel(type))}
                </option>
              `
            ).join('')}
          </select>
        </div>
        <div class="field">
          <label for="relationNoteInput">Nota</label>
          <textarea id="relationNoteInput" class="character-relation-notes" maxlength="200" placeholder="Máximo 200 caracteres">${escapeHtml(selectedNote)}</textarea>
        </div>
        <div class="field character-relation-composer-actions">
          <label>&nbsp;</label>
            <div class="character-relation-composer-buttons">
            <button id="addRelationButton" class="action-button" type="button">${isEditing ? 'Guardar' : 'Añadir'}</button>
            ${
              isEditing
                ? `
                  <button id="deleteEditingRelationButton" class="danger-button" type="button">Eliminar</button>
                  <button id="cancelRelationComposerButton" class="secondary" type="button">Cancelar</button>
                `
                : ''
            }
          </div>
        </div>
      </div>
      <div id="relationComposerMessage" class="character-edit-help">
        ${escapeHtml(isEditing && relationTargetLabel ? `Editando relación con ${relationTargetLabel}.` : 'Máximo 2 progenitores por personaje.')}
      </div>
    </div>
  `;
}

function submitRelationComposer(character) {
  const world = getCurrentWorld();
  if (!world || !character) return;

  const targetSelect = document.getElementById('relationTargetSelect');
  const typeSelect = document.getElementById('relationTypeSelect');
  const noteInput = document.getElementById('relationNoteInput');
  const targetId = targetSelect?.value || '';
  const relationType = typeSelect?.value || 'familia';
  const relationNote = noteInput?.value || '';

  const editingRelation =
    relationComposerState?.characterId === character.id
      ? getCharacterRelation(character, relationComposerState.targetId)
      : null;

  if (!targetId) {
    const message = document.getElementById('relationComposerMessage');
    if (message) message.textContent = 'Selecciona un personaje.';
    return;
  }

  const currentProgenitors = toArray(character.relations).filter((relation) => relation.type === 'progenitor');
  const editingTargetIsProgenitor = editingRelation?.type === 'progenitor';
  const canUseProgenitor = editingTargetIsProgenitor || currentProgenitors.length < 2;
  if (relationType === 'progenitor' && !canUseProgenitor) {
    const message = document.getElementById('relationComposerMessage');
    if (message) message.textContent = 'Máximo 2 progenitores por personaje.';
    return;
  }

  if (editingRelation && relationComposerState?.targetId === targetId) {
    updateRelation(character, targetId, { type: relationType, note: relationNote, rerender: false });
    relationComposerState = null;
    renderCharacterDetail(character);
    return;
  }

  if (editingRelation) {
    const originalTargetId = relationComposerState.targetId;
    relationComposerState = null;
    removeRelation(character, originalTargetId);
    addRelation(character, targetId, relationType, relationNote);
    return;
  }

  addRelation(character, targetId, relationType, relationNote);
}

function deleteRelationComposer(character) {
  if (!relationComposerState || relationComposerState.characterId !== character.id) return;
  const targetId = relationComposerState.targetId;
  relationComposerState = null;
  removeRelation(character, targetId);
}

function renderRelationCard(world, relation, editable, character) {
  const target = getCharacterById(world, relation.targetId);
  const targetLabel = target ? getCharacterDisplayName(target) : 'Personaje eliminado';
  const noteText = String(relation.note || '').trim();
  const hasNote = noteText.length > 0;

  return `
    <div class="character-relation-card" data-relation-target-id="${escapeHtml(relation.targetId)}">
      <div class="character-relation-card-header">
        <button type="button" class="character-relation-name" data-open-related-character-id="${escapeHtml(relation.targetId)}">
          <strong>${escapeHtml(targetLabel)}</strong>
        </button>
        ${editable ? `
          <div class="character-relation-card-actions">
            <button type="button" class="secondary" data-open-relation-edit-id="${escapeHtml(relation.targetId)}">Editar</button>
          </div>
        ` : `
          <div class="character-relation-card-actions">
            <button
              type="button"
              class="secondary"
              data-view-relation-id="${escapeHtml(relation.targetId)}"
              aria-label="Ver relación"
              ${hasNote ? '' : 'disabled'}
              title="${hasNote ? 'Ver texto de la relación' : 'Esta relación no tiene texto'}"
            >👁</button>
          </div>
        `}
      </div>
    </div>
  `;
}

function renderRelationGroup(world, character, section, editable) {
  const relations = section.relations;
  const collapsed = collapsedRelationGroups.has(section.type);

  return `
    <div class="character-relation-section">
      <div class="character-panel-title character-relation-section-header">
        <button
          type="button"
          class="character-relation-section-toggle"
          data-toggle-relation-group="${escapeHtml(section.type)}"
          aria-expanded="${collapsed ? 'false' : 'true'}"
        >
          <h4>${escapeHtml(section.label)}</h4>
          <span>${relations.length}</span>
          <span class="character-relation-chevron" aria-hidden="true">${collapsed ? '▸' : '▾'}</span>
        </button>
      </div>
      ${
        relations.length
          ? collapsed
            ? ''
            : `<div class="character-relation-group">${relations.map((relation) => renderRelationCard(world, relation, editable, character)).join('')}</div>`
          : '<div class="character-relation-group-empty">Sin relaciones de este tipo.</div>'
      }
    </div>
  `;
}

function renderCharacterDetail(character) {
  const world = getCurrentWorld();
  if (!world || !characterDetailView) return;

  characterListView?.classList.add('hidden');
  characterDetailView.classList.remove('hidden');

  const editable = characterEditMode;
  const regions = getRegions(world);
  const items = getItems(world);
  const regionOptions = getWritableSelectOptions(regions, getRegionName);
  const itemOptions = getWritableSelectOptions(items, getItemName);
  const leadOrganizations = getLeadOrganizations(world, character.id);
  const relationSections = getRelationSections(character);
  const displayName = getCharacterDisplayName(character);
  const subtitle = getCharacterSubtitle(character);
  const birthRegion = character.birthRegionId ? getRegionById(world, character.birthRegionId) : null;
  const residenceRegions = toArray(character.residenceRegionIds)
    .map((regionId) => getRegionById(world, regionId))
    .filter(Boolean);
  const ownedItems = toArray(character.itemIds)
    .map((itemId) => getItemById(world, itemId))
    .filter(Boolean);

  characterDetailView.innerHTML = `
    <div class="character-detail-header">
      <div class="character-detail-title">
        <p class="detail-kicker">Personaje</p>
        <h2 class="page-title">${escapeHtml(displayName)}</h2>
        ${subtitle ? `<p class="character-detail-subtitle">${escapeHtml(subtitle)}</p>` : ''}
      </div>
      <div class="character-detail-actions">
        <button id="backToCharactersButton" class="action-button secondary" type="button">← Personajes</button>
        <button id="toggleCharacterEditButton" class="action-button" type="button">${editable ? 'Hecho' : 'Editar'}</button>
        <button id="deleteCharacterButton" class="danger-button" type="button">Eliminar personaje</button>
      </div>
    </div>

    <div class="character-main-grid">
      <section class="character-core-panel">
        <div class="character-panel-title">
          <h3>Identidad</h3>
          <span>${escapeHtml(getCharacterTypeLabel(character.type))}</span>
        </div>

        ${
          editable
            ? `
              <div class="character-edit-section">
                <div class="field">
                  <label>Tipo</label>
                  ${renderTypeButtons(character, true)}
                </div>
                <div class="field">
                  <label for="characterStatusSelect">Estado</label>
                  <select id="characterStatusSelect" class="character-select">
                    ${CHARACTER_STATUSES.map((status) => `<option value="${status}" ${character.status === status ? 'selected' : ''}>${escapeHtml(getStatusLabel(status))}</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="character-summary-list">
                <div class="field">
                  <label for="characterFirstNameInput">Nombre</label>
                  <input id="characterFirstNameInput" class="character-text-input" type="text" value="${escapeHtml(character.firstName || '')}" />
                </div>
                <div class="field">
                  <label for="characterLastNameInput">Primer apellido</label>
                  <input id="characterLastNameInput" class="character-text-input" type="text" value="${escapeHtml(character.lastName || '')}" />
                </div>
                <div class="field">
                  <label for="characterSecondLastNameInput">Segundo apellido</label>
                  <input id="characterSecondLastNameInput" class="character-text-input" type="text" value="${escapeHtml(character.secondLastName || '')}" />
                </div>
                <div class="field">
                  <label for="characterTitleInput">Título</label>
                  <input id="characterTitleInput" class="character-text-input" type="text" value="${escapeHtml(character.title || '')}" />
                </div>
                <div class="field">
                  <label for="characterAliasInput">Alias</label>
                  <input id="characterAliasInput" class="character-text-input" type="text" value="${escapeHtml(character.alias || '')}" />
                </div>
                <div class="field">
                  <label for="characterGenderInput">Género</label>
                  <input id="characterGenderInput" class="character-text-input" type="text" value="${escapeHtml(character.gender || '')}" />
                </div>
                <div class="field">
                  <label for="characterAgeInput">Edad</label>
                  <input id="characterAgeInput" class="character-number-input" type="number" min="0" step="1" value="${character.age === null || character.age === undefined ? '' : escapeHtml(character.age)}" />
                </div>
                <div class="field">
                  <label for="characterBirthRegionSelect">Lugar de nacimiento</label>
                  <select id="characterBirthRegionSelect" class="character-select">
                    ${renderSelectOptions(regions.map((region) => ({ id: region.id, label: getRegionName(region) })), character.birthRegionId, 'Sin regiones')}
                  </select>
                </div>
              </div>
            `
            : `
              <div class="character-summary-list">
                ${renderReadOnlyField('Tipo', getCharacterTypeLabel(character.type))}
                ${renderReadOnlyField('Estado', getStatusLabel(character.status))}
                ${renderReadOnlyField('Nombre', character.firstName)}
                ${renderReadOnlyField('Primer apellido', character.lastName)}
                ${renderReadOnlyField('Segundo apellido', character.secondLastName)}
                ${renderReadOnlyField('Título', character.title)}
                ${renderReadOnlyField('Alias', character.alias)}
                ${renderReadOnlyField('Género', character.gender)}
                ${renderReadOnlyField('Edad', character.age === null || character.age === undefined ? '' : String(character.age), 'Sin edad.')}
                ${renderReadOnlyField('Lugar de nacimiento', birthRegion ? getRegionName(birthRegion) : '', 'Sin lugar de nacimiento.')}
              </div>
            `
        }
      </section>

      <section class="character-narrative-panel">
        <div class="character-panel-title">
          <h3>Notas y perfil</h3>
          <span>Texto libre</span>
        </div>

        ${editable ? `
          <div class="character-edit-section">
            <div class="field">
              <label for="characterNotesInput">Notas</label>
              <textarea id="characterNotesInput" class="character-textarea" placeholder="Notas generales">${escapeHtml(character.notes || '')}</textarea>
            </div>
            <div class="field">
              <label for="characterDescriptionInput">Descripción</label>
              <textarea id="characterDescriptionInput" class="character-textarea" placeholder="Descripción física, contexto o presentación">${escapeHtml(character.description || '')}</textarea>
            </div>
            <div class="field">
              <label for="characterMotivationsInput">Motivaciones</label>
              <textarea id="characterMotivationsInput" class="character-textarea" placeholder="Motivaciones del personaje">${escapeHtml(character.motivations || '')}</textarea>
            </div>
            <div class="field">
              <label for="characterPersonalityInput">Personalidad</label>
              <textarea id="characterPersonalityInput" class="character-textarea" placeholder="Rasgos de personalidad">${escapeHtml(character.personality || '')}</textarea>
            </div>

            <div class="character-divider" aria-hidden="true"></div>

            <div class="field full-width">
              <label>Residencia</label>
              <div class="character-select-stack">
                ${renderWritableSelectMarkup({
                  inputId: 'characterResidenceInput',
                  panelId: 'characterResidencePanel',
                  placeholder: 'Escribe una región...',
                  options: regionOptions
                })}
                ${renderTagList(
                  residenceRegions,
                  getRegionName,
                  'Aún no hay regiones de residencia.',
                  'data-remove-character-residence-id'
                )}
              </div>
            </div>

            <div class="field full-width">
              <label>Objetos</label>
              <div class="character-select-stack">
                ${renderWritableSelectMarkup({
                  inputId: 'characterItemsInput',
                  panelId: 'characterItemsPanel',
                  placeholder: 'Escribe un objeto...',
                  options: itemOptions
                })}
                ${renderTagList(
                  ownedItems,
                  getItemName,
                  'Aún no hay objetos asignados.',
                  'data-remove-character-item-id'
                )}
              </div>
            </div>

            <div class="field">
              <label>Líder de organizaciones</label>
              ${renderChipList(leadOrganizations, getOrganizationName, 'No lidera organizaciones.')}
            </div>
          </div>
        ` : `
          <div class="character-edit-section">
            ${renderReadOnlyField('Notas', character.notes, 'Sin notas.')}
            ${renderReadOnlyField('Descripción', character.description, 'Sin descripción.')}
            ${renderReadOnlyField('Motivaciones', character.motivations, 'Sin motivaciones.')}
            ${renderReadOnlyField('Personalidad', character.personality, 'Sin personalidad definida.')}

            <div class="character-divider" aria-hidden="true"></div>

            ${renderReadOnlyField('Residencia', residenceRegions.length ? residenceRegions.map((region) => getRegionName(region)).join(' · ') : '', 'Sin residencia.', 'full-width')}
            ${renderReadOnlyField('Objetos', ownedItems.length ? ownedItems.map((item) => getItemName(item)).join(' · ') : '', 'Sin objetos.', 'full-width')}
            ${renderReadOnlyField('Líder de organizaciones', leadOrganizations.length ? leadOrganizations.map((organization) => getOrganizationName(organization)).join(' · ') : '', 'No lidera organizaciones.')}
          </div>
        `}
      </section>
    </div>

    <div class="character-divider" aria-hidden="true"></div>

    <section class="character-relations-panel">
      <h3>Relaciones</h3>
      ${editable ? renderRelationComposer(character, world) : ''}

      ${relationSections.map((section) => renderRelationGroup(world, character, section, editable)).join('')}
    </section>
  `;

  document.getElementById('backToCharactersButton')?.addEventListener('click', showCharacterList);
  document.getElementById('toggleCharacterEditButton')?.addEventListener('click', toggleCharacterEditMode);
  document.getElementById('deleteCharacterButton')?.addEventListener('click', () => {
    openDeleteCharacterModal(character);
  });

  if (editable) {
    document.getElementById('characterFirstNameInput')?.addEventListener('input', (event) => {
      setCharacterField(character, 'name', event.target.value);
      const title = characterDetailView.querySelector('.character-detail-title .page-title');
      if (title) {
        title.textContent = String(event.target.value).trim() || 'Personaje sin nombre';
      }
    });

    document.getElementById('characterLastNameInput')?.addEventListener('input', (event) => {
      setCharacterField(character, 'lastName', String(event.target.value || '').trim());
    });

    document.getElementById('characterSecondLastNameInput')?.addEventListener('input', (event) => {
      setCharacterField(character, 'secondLastName', String(event.target.value || '').trim());
    });

    document.getElementById('characterTitleInput')?.addEventListener('input', (event) => {
      setCharacterField(character, 'title', String(event.target.value || '').trim());
    });

    document.getElementById('characterAliasInput')?.addEventListener('input', (event) => {
      setCharacterField(character, 'alias', String(event.target.value || '').trim());
    });

    document.getElementById('characterGenderInput')?.addEventListener('input', (event) => {
      setCharacterField(character, 'gender', String(event.target.value || '').trim());
    });

    document.getElementById('characterAgeInput')?.addEventListener('input', (event) => {
      setCharacterField(character, 'age', event.target.value);
    });

    document.getElementById('characterStatusSelect')?.addEventListener('change', (event) => {
      setCharacterStatus(character, event.target.value);
    });

    document.getElementById('characterBirthRegionSelect')?.addEventListener('change', (event) => {
      setCharacterField(character, 'birthRegionId', event.target.value);
    });

    setupWritableSelect({
      inputId: 'characterResidenceInput',
      panelId: 'characterResidencePanel',
      options: regionOptions,
      onPick: (regionId) => addCharacterListValue(character, 'residenceRegionIds', regionId)
    });

    setupWritableSelect({
      inputId: 'characterItemsInput',
      panelId: 'characterItemsPanel',
      options: itemOptions,
      onPick: (itemId) => addCharacterListValue(character, 'itemIds', itemId)
    });

    characterDetailView.querySelectorAll('input[name="characterType"]').forEach((input) => {
      input.addEventListener('change', (event) => {
        setCharacterType(character, event.target.value);
      });
    });

    document.getElementById('characterNotesInput')?.addEventListener('input', (event) => {
      setCharacterField(character, 'notes', String(event.target.value || '').trim());
    });

    document.getElementById('characterDescriptionInput')?.addEventListener('input', (event) => {
      setCharacterField(character, 'description', String(event.target.value || '').trim());
    });

    document.getElementById('characterMotivationsInput')?.addEventListener('input', (event) => {
      setCharacterField(character, 'motivations', String(event.target.value || '').trim());
    });

    document.getElementById('characterPersonalityInput')?.addEventListener('input', (event) => {
      setCharacterField(character, 'personality', String(event.target.value || '').trim());
    });

    characterDetailView.querySelectorAll('[data-remove-character-residence-id]').forEach((button) => {
      button.addEventListener('click', () => {
        removeCharacterListValue(character, 'residenceRegionIds', button.dataset.removeCharacterResidenceId);
      });
    });

    characterDetailView.querySelectorAll('[data-remove-character-item-id]').forEach((button) => {
      button.addEventListener('click', () => {
        removeCharacterListValue(character, 'itemIds', button.dataset.removeCharacterItemId);
      });
    });

    document.getElementById('addRelationButton')?.addEventListener('click', () => {
      submitRelationComposer(character);
    });

    document.getElementById('relationNoteInput')?.addEventListener('input', (event) => {
      const message = document.getElementById('relationComposerMessage');
      if (message) {
        const remaining = 200 - String(event.target.value || '').length;
        message.textContent = remaining >= 0 ? `Te quedan ${remaining} caracteres.` : 'La nota no puede superar 200 caracteres.';
      }
    });

    document.getElementById('deleteEditingRelationButton')?.addEventListener('click', () => {
      deleteRelationComposer(character);
    });

    document.getElementById('cancelRelationComposerButton')?.addEventListener('click', () => {
      closeRelationComposer();
      renderCharacterDetail(character);
    });

  }

  characterDetailView.querySelectorAll('[data-open-related-character-id]').forEach((button) => {
    button.addEventListener('click', () => {
      openCharacterFromRelation(button.dataset.openRelatedCharacterId);
    });
  });

  characterDetailView.querySelectorAll('[data-view-relation-id]').forEach((button) => {
    button.addEventListener('click', () => {
      openRelationModal(character, button.dataset.viewRelationId, 'view');
    });
  });

  characterDetailView.querySelectorAll('[data-open-relation-edit-id]').forEach((button) => {
    button.addEventListener('click', () => {
      openRelationModal(character, button.dataset.openRelationEditId, 'edit');
    });
  });

  characterDetailView.querySelectorAll('[data-toggle-relation-group]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const type = event.currentTarget.dataset.toggleRelationGroup;
      if (!type) return;
      if (collapsedRelationGroups.has(type)) {
        collapsedRelationGroups.delete(type);
      } else {
        collapsedRelationGroups.add(type);
      }
      renderCharacterDetail(character);
    });
  });

  characterDetailView.querySelectorAll('[data-remove-relation-id]').forEach((button) => {
    button.addEventListener('click', () => {
      removeRelation(character, button.dataset.removeRelationId);
    });
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

  const selectedCharacter = getSelectedCharacter(world);
  if (selectedCharacter) {
    renderCharacterDetail(selectedCharacter);
    return;
  }

  characterEditMode = false;
  renderCharacterLists();
}

window.addEventListener('DOMContentLoaded', () => {
  loadWorlds();

  createCharacterButton?.addEventListener('click', createCharacter);
  deleteCharacterModalCancel?.addEventListener('click', closeDeleteCharacterModal);
  deleteCharacterModalConfirm?.addEventListener('click', () => {
    if (!characterPendingDeleteId) return;
    deleteCharacter(characterPendingDeleteId);
  });
  deleteCharacterModal?.addEventListener('click', (event) => {
    if (event.target === deleteCharacterModal) {
      closeDeleteCharacterModal();
    }
  });

  relationModalCancel?.addEventListener('click', closeRelationModal);
  relationModalConfirm?.addEventListener('click', saveOpenRelationModal);
  relationModalDelete?.addEventListener('click', deleteOpenRelation);
  relationModal?.addEventListener('click', (event) => {
    if (event.target === relationModal) {
      closeRelationModal();
    }
  });
  relationModalBody?.addEventListener('click', (event) => {
    const targetButton = event.target.closest('[data-open-character-id]');
    if (!targetButton) return;
    closeRelationModal();
    openCharacterDetail(targetButton.dataset.openCharacterId);
  });

  render();
});
