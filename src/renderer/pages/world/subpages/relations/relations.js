const STORAGE_KEY_WORLDS = 'quest4quill_worlds';

const CHARACTER_TYPE_LABELS = {
  principal: 'Principal',
  major: 'Mayor',
  minor: 'Menor'
};

const CHARACTER_STATUS_LABELS = {
  alive: 'Vivo',
  unknown: 'Desconocido',
  injured: 'Herido',
  dead: 'Fallecido'
};

const RELATION_LABELS = {
  progenitor: 'Progenitor',
  descendiente: 'Descendiente',
  hermano: 'Hermano/a',
  familia: 'Familia',
  amigo: 'Amigo',
  amante: 'Amante',
  rival: 'Rival',
  holder: 'Portador'
};

const RELATION_DISTANCE = {
  progenitor: 180,
  descendiente: 180,
  hermano: 168,
  familia: 192,
  amigo: 172,
  amante: 160,
  rival: 184
};

const RELATION_STRENGTH = {
  progenitor: 0.036,
  descendiente: 0.036,
  hermano: 0.03,
  familia: 0.024,
  amigo: 0.028,
  amante: 0.031,
  rival: 0.027
};

const worldTitle = document.getElementById('worldTitle');
const relationsStats = document.getElementById('relationsStats');
const relationsDetailsCount = document.getElementById('relationsDetailsCount');
const relationsDetails = document.getElementById('relationsDetails');
const relationsWorkspace = document.getElementById('relationsWorkspace');
const relationsLayout = document.getElementById('relationsLayout');
const relationsGraphStage = document.getElementById('relationsGraphStage');
const relationsGraphViewport = document.getElementById('relationsGraphViewport');
const relationsEdges = document.getElementById('relationsEdges');
const relationsNodeLayer = document.getElementById('relationsNodeLayer');
const relationsEmptyState = document.getElementById('relationsEmptyState');
const graphFullscreenButton = document.getElementById('graphFullscreenButton');
const graphZoomOutButton = document.getElementById('graphZoomOutButton');
const graphResetViewButton = document.getElementById('graphResetViewButton');
const graphZoomInButton = document.getElementById('graphZoomInButton');

let worlds = [];
let selectedNodeId = null;
let graphState = null;
let graphResizeObserver = null;
let graphFullscreen = false;
let graphAnimationFrameId = null;
let graphNodeDragState = null;
let graphNodeClickSuppressedId = null;
let graphViewState = {
  scale: 1,
  offsetX: 0,
  offsetY: 0
};
let graphPanState = null;

const GRAPH_ZOOM_MIN = 0.5;
const GRAPH_ZOOM_MAX = 2.2;
const GRAPH_ZOOM_STEP = 0.15;
const GRAPH_POINTER_MOVE_THRESHOLD = 4;
const GRAPH_NODE_DRAG_THRESHOLD = 4;
const GRAPH_NODE_DRAG_STIFFNESS = 0.12;
const GRAPH_NODE_DRAG_DAMPING = 0.76;

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

function getCharacters(world) {
  if (!world) return [];
  if (!Array.isArray(world.characters)) world.characters = [];
  return world.characters;
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function resetGraphView() {
  graphViewState = {
    scale: 1,
    offsetX: 0,
    offsetY: 0
  };
  syncGraphView();
}

function syncGraphView() {
  if (!relationsGraphViewport) return;

  relationsGraphViewport.style.transform = `translate3d(${graphViewState.offsetX}px, ${graphViewState.offsetY}px, 0) scale(${graphViewState.scale})`;

  if (graphResetViewButton) {
    graphResetViewButton.disabled = graphViewState.scale === 1 && graphViewState.offsetX === 0 && graphViewState.offsetY === 0;
  }
}

function getGraphStagePoint(clientX, clientY) {
  const rect = relationsGraphStage?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };

  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

function getGraphCoordinatesFromStagePoint(clientX, clientY) {
  const stagePoint = getGraphStagePoint(clientX, clientY);
  const scale = graphViewState.scale || 1;
  return {
    x: (stagePoint.x - graphViewState.offsetX) / scale,
    y: (stagePoint.y - graphViewState.offsetY) / scale
  };
}

function zoomGraphView(nextScale, anchorX, anchorY) {
  const clampedScale = clamp(nextScale, GRAPH_ZOOM_MIN, GRAPH_ZOOM_MAX);
  const currentScale = graphViewState.scale || 1;
  const originX = anchorX - graphViewState.offsetX;
  const originY = anchorY - graphViewState.offsetY;
  const contentX = originX / currentScale;
  const contentY = originY / currentScale;

  graphViewState.scale = clampedScale;
  graphViewState.offsetX = anchorX - contentX * clampedScale;
  graphViewState.offsetY = anchorY - contentY * clampedScale;
  syncGraphView();
}

function zoomGraphViewBy(delta, anchorX, anchorY) {
  zoomGraphView(graphViewState.scale * delta, anchorX, anchorY);
}

function resetGraphPanIfNeeded() {
  if (graphPanState) {
    graphPanState = null;
  }
  if (relationsGraphStage) {
    relationsGraphStage.classList.remove('is-panning');
  }
}

function cancelGraphAnimation() {
  if (graphAnimationFrameId !== null) {
    window.cancelAnimationFrame(graphAnimationFrameId);
    graphAnimationFrameId = null;
  }
}

function scheduleGraphAnimation() {
  if (graphAnimationFrameId !== null || !graphState) return;
  graphAnimationFrameId = window.requestAnimationFrame(runGraphAnimationFrame);
}

function syncNodeElementPositions() {
  if (!graphState?.nodeElements) return;

  graphState.nodeElements.forEach((button, nodeId) => {
    const node = graphState.nodeMap.get(nodeId);
    if (!node) return;
    button.style.left = `${node.x}px`;
    button.style.top = `${node.y}px`;
  });
}

function beginNodeDrag(button, event) {
  if (!graphState || event.button !== 0) return;

  const nodeId = button.dataset.nodeId || '';
  const node = graphState.nodeMap.get(nodeId);
  if (!node) return;

  const startPoint = getGraphCoordinatesFromStagePoint(event.clientX, event.clientY);
  graphNodeDragState = {
    nodeId,
    pointerId: event.pointerId,
    sourceElement: button,
    startX: startPoint.x,
    startY: startPoint.y,
    nodeStartX: node.x,
    nodeStartY: node.y,
    targetX: node.x,
    targetY: node.y,
    moved: false
  };

  try {
    button.setPointerCapture(event.pointerId);
  } catch (error) {
    // Ignorar si el navegador no permite capture en este momento.
  }

  event.preventDefault();
  event.stopPropagation();
  scheduleGraphAnimation();
}

function getGraphEnergy(graph) {
  return graph.nodes.reduce((sum, node) => sum + Math.abs(node.vx) + Math.abs(node.vy), 0);
}

function applyGraphPhysicsStep(graph, width, height) {
  const nodes = graph.nodes;
  const nodeMap = graph.nodeMap;
  const centerX = width / 2;
  const centerY = height / 2;
  const draggedNode = graphNodeDragState ? nodeMap.get(graphNodeDragState.nodeId) || null : null;

  for (let i = 0; i < nodes.length; i += 1) {
    const leftNode = nodes[i];
    for (let j = i + 1; j < nodes.length; j += 1) {
      const rightNode = nodes[j];
      const dx = rightNode.x - leftNode.x;
      const dy = rightNode.y - leftNode.y;
      const distanceSquared = dx * dx + dy * dy + 0.01;
      const distance = Math.sqrt(distanceSquared);
      const minDistance = (leftNode.radius + rightNode.radius) * 0.95;
      const repelStrength = leftNode.kind === 'character' && rightNode.kind === 'character'
        ? 8200
        : leftNode.kind === 'item' && rightNode.kind === 'item'
          ? 1800
          : 5200;
      const force = repelStrength / distanceSquared;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;

      leftNode.vx -= fx;
      leftNode.vy -= fy;
      rightNode.vx += fx;
      rightNode.vy += fy;

      if (distance < minDistance) {
        const overlap = minDistance - distance;
        const shove = overlap * 0.05;
        const pushX = (dx / distance) * shove;
        const pushY = (dy / distance) * shove;
        leftNode.vx -= pushX;
        leftNode.vy -= pushY;
        rightNode.vx += pushX;
        rightNode.vy += pushY;
      }
    }
  }

  graph.edges.forEach((edge) => {
    const sourceNode = nodeMap.get(edge.sourceId);
    const targetNode = nodeMap.get(edge.targetId);
    if (!sourceNode || !targetNode) return;

    const dx = targetNode.x - sourceNode.x;
    const dy = targetNode.y - sourceNode.y;
    const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 0.001);
    const desiredDistance = getDesiredDistance(edge.type);
    const strength = getLinkStrength(edge.type);
    const offset = (distance - desiredDistance) * strength;
    const fx = (dx / distance) * offset;
    const fy = (dy / distance) * offset;

    sourceNode.vx += fx;
    sourceNode.vy += fy;
    targetNode.vx -= fx;
    targetNode.vy -= fy;
  });

  nodes.forEach((node) => {
    const centerStrength = node.kind === 'item' ? 0.0018 : 0.0034;
    node.vx += (centerX - node.x) * centerStrength;
    node.vy += (centerY - node.y) * centerStrength;

    if (draggedNode && node.id === draggedNode.id) {
      const targetX = graphNodeDragState.targetX;
      const targetY = graphNodeDragState.targetY;
      node.vx += (targetX - node.x) * GRAPH_NODE_DRAG_STIFFNESS;
      node.vy += (targetY - node.y) * GRAPH_NODE_DRAG_STIFFNESS;
      node.vx *= GRAPH_NODE_DRAG_DAMPING;
      node.vy *= GRAPH_NODE_DRAG_DAMPING;
    } else {
      node.vx *= 0.78;
      node.vy *= 0.78;
    }

    node.x += node.vx;
    node.y += node.vy;

    const padding = node.radius + 20;
    node.x = clamp(node.x, padding, width - padding);
    node.y = clamp(node.y, padding, height - padding);
  });
}

function runGraphPhysicsIterations(graph, width, height, iterations) {
  for (let step = 0; step < iterations; step += 1) {
    applyGraphPhysicsStep(graph, width, height);
    if (getGraphEnergy(graph) < graph.nodes.length * 0.18) break;
  }
}

function runGraphAnimationFrame() {
  graphAnimationFrameId = null;
  if (!graphState) return;

  const width = graphState.width || relationsGraphStage?.clientWidth || 800;
  const height = graphState.height || relationsGraphStage?.clientHeight || 560;
  runGraphPhysicsIterations(graphState, width, height, graphNodeDragState ? 3 : 2);
  syncNodeElementPositions();
  renderEdgePositions();
  updateGraphHighlights();

  if (graphNodeDragState || getGraphEnergy(graphState) > graphState.nodes.length * 0.18) {
    scheduleGraphAnimation();
  }
}

function setGraphFullscreen(nextValue) {
  graphFullscreen = Boolean(nextValue);
  relationsWorkspace?.classList.toggle('is-fullscreen', graphFullscreen);
  relationsLayout?.classList.toggle('is-fullscreen', graphFullscreen);

  if (graphFullscreenButton) {
    graphFullscreenButton.setAttribute('aria-pressed', graphFullscreen ? 'true' : 'false');
    graphFullscreenButton.setAttribute('aria-label', graphFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa');
    graphFullscreenButton.setAttribute('title', graphFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa');
    graphFullscreenButton.textContent = graphFullscreen ? '✕' : '⛶';
  }

  syncGraphView();
  handleResize();
}

function getCharacterName(character) {
  const firstName = String(character?.firstName || '').trim();
  const lastName = String(character?.lastName || '').trim();
  const secondLastName = String(character?.secondLastName || '').trim();
  const name = [firstName, lastName, secondLastName].filter(Boolean).join(' ').trim();
  return name || String(character?.alias || character?.title || 'Personaje sin nombre').trim();
}

function getCharacterTypeLabel(type) {
  return CHARACTER_TYPE_LABELS[type] || CHARACTER_TYPE_LABELS.principal;
}

function getStatusLabel(status) {
  return CHARACTER_STATUS_LABELS[status] || CHARACTER_STATUS_LABELS.alive;
}

function getCharacterSummary(character) {
  const parts = [getCharacterTypeLabel(character.type), getStatusLabel(character.status)];
  if (character.age !== null && character.age !== undefined && character.age !== '') {
    parts.push(`${character.age} a\u00f1os`);
  }
  return parts.join(' \u00b7 ');
}

function getItemName(item) {
  const name = String(item?.name || '').trim();
  return name || 'Objeto sin nombre';
}

function getItemTypeLabel(item) {
  const type = String(item?.type || '').trim();
  return type || 'Sin tipo';
}

function getRegionName(region) {
  const name = String(region?.name || '').trim();
  return name || 'Regi\u00f3n sin nombre';
}

function getLocationName(location) {
  const name = String(location?.name || '').trim();
  return name || 'Ubicaci\u00f3n sin nombre';
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

function getItemById(world, itemId) {
  return getItems(world).find((item) => item.id === itemId) || null;
}

function getRelationLabel(type) {
  return RELATION_LABELS[type] || type || 'Relaci\u00f3n';
}

function getItemLocationLabel(world, item) {
  const locationType = String(item?.locationType || '').trim();
  const locationId = String(item?.locationId || '').trim();

  if (locationType === 'region' && locationId) {
    const region = getRegionById(world, locationId);
    if (region) return `Regi\u00f3n \u00b7 ${getRegionName(region)}`;
  }

  if (locationType === 'location' && locationId) {
    const location = getLocationById(world, locationId);
    if (location) return `Ubicaci\u00f3n \u00b7 ${getLocationName(location)}`;
  }

  if (locationId) {
    const region = getRegionById(world, locationId);
    if (region) return `Regi\u00f3n \u00b7 ${getRegionName(region)}`;
    const location = getLocationById(world, locationId);
    if (location) return `Ubicaci\u00f3n \u00b7 ${getLocationName(location)}`;
  }

  return 'Sin localizaci\u00f3n';
}

function getItemHolderId(world, item) {
  const explicitHolderId = String(item?.holderId || '').trim();
  if (explicitHolderId && getCharacterById(world, explicitHolderId)) {
    return explicitHolderId;
  }

  return getCharacters(world).find((character) => toArray(character.itemIds).includes(item.id))?.id || '';
}

function setSelectedNodeId(nodeId, syncUrl = true) {
  if (!graphState || (nodeId && !graphState.nodeMap.has(nodeId))) {
    selectedNodeId = null;
  } else {
    selectedNodeId = nodeId || null;
  }

  if (syncUrl) {
    const url = new URL(window.location.href);
    if (selectedNodeId) {
      url.searchParams.set('nodeId', selectedNodeId);
    } else {
      url.searchParams.delete('nodeId');
    }
    window.history.replaceState({}, '', url);
  }

  updateGraphHighlights();
  renderDetailsPanel();
}

function getSelectedNodeIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('nodeId');
}

function openNodeInParent(node) {
  const worldId = getWorldIdFromUrl();
  const parentUrl = new URL(window.parent.location.href);
  if (worldId) {
    parentUrl.searchParams.set('worldId', worldId);
  }

  if (node.kind === 'character') {
    parentUrl.searchParams.set('tab', 'characters');
    parentUrl.searchParams.set('characterId', node.id);
  } else if (node.kind === 'item') {
    parentUrl.searchParams.set('tab', 'items');
    parentUrl.searchParams.set('itemId', node.id);
  }

  window.parent.location.href = parentUrl.toString();
}

function buildGraphData(world) {
  const characters = getCharacters(world);
  const items = getItems(world);
  const characterNodes = characters.map((character) => ({
    id: character.id,
    kind: 'character',
    label: getCharacterName(character),
    subtitle: getCharacterSummary(character),
    data: character,
    radius: 62,
    width: 124,
    height: 124
  }));
  const itemNodes = items.map((item) => ({
    id: item.id,
    kind: 'item',
    label: getItemName(item),
    subtitle: getItemTypeLabel(item),
    data: item,
    holderId: getItemHolderId(world, item),
    radius: 47,
    width: 94,
    height: 94
  }));
  const nodes = [...characterNodes, ...itemNodes];
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const pairMap = new Map();

  characters.forEach((character) => {
    toArray(character.relations).forEach((relation) => {
      const targetCharacter = getCharacterById(world, relation.targetId);
      if (!targetCharacter || targetCharacter.id === character.id) return;

      const pairKey = [character.id, targetCharacter.id].sort().join('::');
      if (!pairMap.has(pairKey)) {
        pairMap.set(pairKey, {
          firstId: [character.id, targetCharacter.id].sort()[0],
          secondId: [character.id, targetCharacter.id].sort()[1],
          relations: []
        });
      }

      pairMap.get(pairKey).relations.push({
        sourceId: character.id,
        targetId: targetCharacter.id,
        type: relation.type,
        note: relation.note || ''
      });
    });
  });

  const edges = [];
  pairMap.forEach((pair) => {
    const firstRelation = pair.relations.find((relation) => relation.sourceId === pair.firstId) || null;
    const secondRelation = pair.relations.find((relation) => relation.sourceId === pair.secondId) || null;

    let edge = null;
    if (firstRelation?.type === 'progenitor') {
      edge = { id: `char-${pair.firstId}-${pair.secondId}`, sourceId: pair.firstId, targetId: pair.secondId, type: 'progenitor' };
    } else if (secondRelation?.type === 'progenitor') {
      edge = { id: `char-${pair.secondId}-${pair.firstId}`, sourceId: pair.secondId, targetId: pair.firstId, type: 'progenitor' };
    } else {
      const relation = firstRelation || secondRelation;
      if (relation) {
        edge = {
          id: `char-${pair.firstId}-${pair.secondId}-${relation.type || 'familia'}`,
          sourceId: relation.sourceId,
          targetId: relation.targetId,
          type: relation.type || 'familia'
        };
      }
    }

    if (edge) {
      edges.push(edge);
    }
  });

  items.forEach((item) => {
    const holderId = getItemHolderId(world, item);
    if (!holderId || !nodeMap.has(holderId)) return;
    edges.push({
      id: `item-${item.id}-${holderId}`,
      sourceId: item.id,
      targetId: holderId,
      type: 'holder'
    });
  });

  const neighborMap = new Map();

  function addNeighbor(fromId, toId, type) {
    const targetNode = nodeMap.get(toId);
    if (!targetNode) return;

    if (!neighborMap.has(fromId)) {
      neighborMap.set(fromId, new Map());
    }

    const bucket = neighborMap.get(fromId);
    if (!bucket.has(toId)) {
      bucket.set(toId, {
        id: targetNode.id,
        label: targetNode.label,
        kind: targetNode.kind,
        types: new Set()
      });
    }

    bucket.get(toId).types.add(type);
  }

  edges.forEach((edge) => {
    addNeighbor(edge.sourceId, edge.targetId, edge.type);
    addNeighbor(edge.targetId, edge.sourceId, edge.type === 'progenitor' ? 'descendiente' : edge.type === 'descendiente' ? 'progenitor' : edge.type);
  });

  return {
    nodes,
    edges,
    nodeMap,
    neighborMap,
    stats: {
      characters: characterNodes.length,
      items: itemNodes.length,
      links: edges.length
    }
  };
}

function getDesiredDistance(type) {
  if (type === 'holder') return 96;
  return RELATION_DISTANCE[type] || 182;
}

function getLinkStrength(type) {
  if (type === 'holder') return 0.08;
  return RELATION_STRENGTH[type] || 0.025;
}

function initializeNodePositions(graph, width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  const characterNodes = graph.nodes.filter((node) => node.kind === 'character');
  const itemNodes = graph.nodes.filter((node) => node.kind === 'item');
  const ringRadius = Math.min(width, height) * 0.28;

  characterNodes.forEach((node, index) => {
    const angle = characterNodes.length ? (index / characterNodes.length) * Math.PI * 2 : 0;
    const jitter = 28;
    node.x = centerX + Math.cos(angle) * ringRadius + (Math.random() - 0.5) * jitter;
    node.y = centerY + Math.sin(angle) * ringRadius + (Math.random() - 0.5) * jitter;
    node.vx = 0;
    node.vy = 0;
  });

  itemNodes.forEach((node, index) => {
    const holderNode = node.holderId ? graph.nodeMap.get(node.holderId) : null;
    if (holderNode) {
      const angle = (index / Math.max(itemNodes.length, 1)) * Math.PI * 2;
      node.x = holderNode.x + Math.cos(angle) * 64 + (Math.random() - 0.5) * 22;
      node.y = holderNode.y + Math.sin(angle) * 64 + (Math.random() - 0.5) * 22;
    } else {
      const angle = (index / Math.max(itemNodes.length, 1)) * Math.PI * 2;
      const radius = ringRadius * 0.55;
      node.x = centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 24;
      node.y = centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 24;
    }
    node.vx = 0;
    node.vy = 0;
  });
}

function relaxGraph(graph, width, height) {
  const nodes = graph.nodes;
  const iterations = Math.min(140, Math.max(60, nodes.length * 4));
  runGraphPhysicsIterations(graph, width, height, iterations);
}

function buildNodeTitle(node) {
  return String(node.label || '').trim() || (node.kind === 'character' ? 'Personaje' : 'Objeto');
}

function renderGraph(resetView = false) {
  const world = getCurrentWorld();
  if (!world) {
    window.location.href = '../../../home/index.html';
    return;
  }

  if (worldTitle) {
    worldTitle.textContent = 'Relaciones';
  }

  resetGraphPanIfNeeded();
  if (resetView) {
    resetGraphView();
  }

  const graph = buildGraphData(world);
  const width = relationsGraphStage?.clientWidth || 800;
  const height = relationsGraphStage?.clientHeight || 560;
  const selectedFromUrl = getSelectedNodeIdFromUrl();
  const nextSelectedId = selectedNodeId && graph.nodeMap.has(selectedNodeId)
    ? selectedNodeId
    : graph.nodeMap.has(selectedFromUrl)
      ? selectedFromUrl
      : null;

  graphState = graph;
  initializeNodePositions(graphState, width, height);
  relaxGraph(graphState, width, height);
  graphState.width = width;
  graphState.height = height;
  graphState.nodeElements = new Map();
  graphState.edgeElements = new Map();

  if (relationsEdges) {
    relationsEdges.setAttribute('viewBox', `0 0 ${width} ${height}`);
    relationsEdges.innerHTML = graphState.edges
      .map((edge) => `
        <line
          class="relation-edge relation-edge-type-${escapeHtml(edge.type)}"
          data-edge-id="${escapeHtml(edge.id)}"
          data-source-id="${escapeHtml(edge.sourceId)}"
          data-target-id="${escapeHtml(edge.targetId)}"
          data-type="${escapeHtml(edge.type)}"
        />
      `)
      .join('');

    relationsEdges.querySelectorAll('[data-edge-id]').forEach((line) => {
      graphState.edgeElements.set(line.dataset.edgeId, line);
    });
  }

  if (relationsNodeLayer) {
    relationsNodeLayer.innerHTML = graphState.nodes
      .map((node) => `
        <button
          type="button"
          class="relation-node relation-node-${node.kind}"
          data-node-id="${escapeHtml(node.id)}"
          data-node-kind="${escapeHtml(node.kind)}"
          style="left:${node.x}px; top:${node.y}px;"
          aria-label="${escapeHtml(buildNodeTitle(node))}"
          title="${escapeHtml(buildNodeTitle(node))}"
        >
          <span class="relation-node-main">${escapeHtml(node.label)}</span>
        </button>
      `)
      .join('');

    relationsNodeLayer.querySelectorAll('[data-node-id]').forEach((button) => {
      graphState.nodeElements.set(button.dataset.nodeId, button);
      button.addEventListener('pointerdown', (event) => {
        beginNodeDrag(button, event);
      });
      button.addEventListener('click', () => {
        if (graphNodeClickSuppressedId === button.dataset.nodeId) {
          graphNodeClickSuppressedId = null;
          return;
        }
        setSelectedNodeId(button.dataset.nodeId);
      });
    });
  }

  if (relationsEmptyState) {
    relationsEmptyState.classList.toggle('hidden', graphState.nodes.length > 0);
  }

  if (!graphState.nodes.length) {
    selectedNodeId = null;
    if (relationsStats) {
      relationsStats.textContent = '0 nodos';
    }
    if (relationsDetailsCount) {
      relationsDetailsCount.textContent = 'Selecciona un nodo';
    }
    renderDetailsPanel();
    syncGraphView();
    return;
  }

  if (nextSelectedId !== selectedNodeId) {
    selectedNodeId = nextSelectedId;
    const url = new URL(window.location.href);
    if (selectedNodeId) {
      url.searchParams.set('nodeId', selectedNodeId);
    } else {
      url.searchParams.delete('nodeId');
    }
    window.history.replaceState({}, '', url);
  }

  renderGraphWithSelection();
  syncGraphView();
}

function updateGraphHighlights() {
  if (!graphState) return;

  const selectedNode = selectedNodeId ? graphState.nodeMap.get(selectedNodeId) || null : null;
  const relatedIds = new Set();
  if (selectedNode) {
    const relatedEntries = graphState.neighborMap.get(selectedNode.id);
    relatedEntries?.forEach((entry) => {
      relatedIds.add(entry.id);
    });
  }

  graphState.nodeElements.forEach((button, nodeId) => {
    button.classList.toggle('is-selected', nodeId === selectedNodeId);
    button.classList.toggle('is-related', relatedIds.has(nodeId));
    button.classList.toggle('is-muted', Boolean(selectedNodeId) && nodeId !== selectedNodeId && !relatedIds.has(nodeId));
  });

  graphState.edgeElements.forEach((line) => {
    const isActive = Boolean(selectedNodeId) && (line.dataset.sourceId === selectedNodeId || line.dataset.targetId === selectedNodeId);
    line.classList.toggle('is-active', isActive);
    line.classList.toggle('is-muted', Boolean(selectedNodeId) && !isActive);
  });
}

function renderEdgePositions() {
  if (!graphState || !relationsEdges) return;

  graphState.edges.forEach((edge) => {
    const line = graphState.edgeElements.get(edge.id);

    const sourceNode = graphState.nodeMap.get(edge.sourceId);
    const targetNode = graphState.nodeMap.get(edge.targetId);
    if (!line || !sourceNode || !targetNode) return;

    const dx = targetNode.x - sourceNode.x;
    const dy = targetNode.y - sourceNode.y;
    const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 0.001);
    const startX = sourceNode.x + (dx / distance) * sourceNode.radius;
    const startY = sourceNode.y + (dy / distance) * sourceNode.radius;
    const endX = targetNode.x - (dx / distance) * targetNode.radius;
    const endY = targetNode.y - (dy / distance) * targetNode.radius;

    line.setAttribute('x1', startX.toFixed(2));
    line.setAttribute('y1', startY.toFixed(2));
    line.setAttribute('x2', endX.toFixed(2));
    line.setAttribute('y2', endY.toFixed(2));
  });
}

function renderDetailField(label, value, fallback) {
  const text = String(value || '').trim();
  return `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${text ? escapeHtml(text) : `<span class="relations-detail-empty-inline">${escapeHtml(fallback)}</span>`}</dd>
    </div>
  `;
}

function getNeighborEntries(nodeId) {
  if (!graphState) return [];
  const entries = graphState.neighborMap.get(nodeId);
  if (!entries) return [];

  return Array.from(entries.values()).sort((left, right) => left.label.localeCompare(right.label, 'es'));
}

function renderDetailsPanel() {
  if (!relationsDetails || !relationsDetailsCount) return;
  const world = getCurrentWorld();

  if (!graphState || !graphState.nodes.length) {
    relationsDetailsCount.textContent = 'Selecciona un nodo';
    relationsDetails.innerHTML = `
      <div class="relations-details-empty">
        <strong>Sin grafo disponible</strong>
        <p>No hay personajes u objetos creados todav\u00eda.</p>
      </div>
    `;
    if (relationsStats) {
      relationsStats.textContent = '0 nodos';
    }
    return;
  }

  if (relationsStats) {
    relationsStats.textContent = `${graphState.stats.characters} personajes \u00b7 ${graphState.stats.items} objetos \u00b7 ${graphState.stats.links} enlaces`;
  }

  const selectedNode = selectedNodeId ? graphState.nodeMap.get(selectedNodeId) || null : null;
  if (!selectedNode) {
    relationsDetailsCount.textContent = `${graphState.nodes.length} nodos`;
    relationsDetails.innerHTML = `
      <div class="relations-details-empty">
        <strong>Selecciona un nodo</strong>
        <p>Pulsa un personaje u objeto para ver sus conexiones y abrir su ficha.</p>
      </div>
    `;
    return;
  }

  const neighbors = getNeighborEntries(selectedNode.id);
  relationsDetailsCount.textContent = `${neighbors.length} conexiones`;

  if (selectedNode.kind === 'character') {
    const connectedCharacters = neighbors.filter((neighbor) => neighbor.kind === 'character');
    const connectedItems = neighbors.filter((neighbor) => neighbor.kind === 'item');
    relationsDetails.innerHTML = `
      <div class="relations-detail-card">
        <div class="relations-detail-title">
          <div class="detail-kicker">Personaje</div>
          <h4>${escapeHtml(selectedNode.label)}</h4>
          <div class="relations-detail-subtitle">${escapeHtml(selectedNode.subtitle || '')}</div>
        </div>
        <div class="relations-detail-pill-row">
          <span class="relations-pill">${connectedCharacters.length} personajes relacionados</span>
          <span class="relations-pill">${connectedItems.length} objetos vinculados</span>
        </div>
        <dl class="relations-detail-list">
          ${renderDetailField('Tipo', getCharacterTypeLabel(selectedNode.data.type), 'Sin tipo.')}
          ${renderDetailField('Estado', getStatusLabel(selectedNode.data.status), 'Sin estado.')}
        </dl>
        <div class="relations-detail-actions">
          <button id="openSelectedNodeButton" class="action-button" type="button">Abrir personaje</button>
        </div>
        <div class="relations-detail-section">
          <div class="panel-heading">
            <h4>Conexiones</h4>
            <span>${neighbors.length}</span>
          </div>
          ${neighbors.length
            ? `<div class="relations-chip-list">
                ${neighbors
                  .map((neighbor) => {
                    const relationLabel = Array.from(neighbor.types).map((type) => getRelationLabel(type)).join(' \u00b7 ');
                    return `
                      <button type="button" class="relations-chip" data-select-node-id="${escapeHtml(neighbor.id)}">
                        <strong>${escapeHtml(neighbor.label)}</strong>
                        <span>${escapeHtml(relationLabel)}</span>
                      </button>
                    `;
                  })
                  .join('')}
              </div>`
            : '<div class="relations-detail-empty-inline">No tiene conexiones.</div>'}
        </div>
      </div>
    `;
  } else {
    const holderId = selectedNode.holderId || getItemHolderId(world, selectedNode.data);
    const holder = holderId ? getCharacterById(world, holderId) : null;
    const locationLabel = getItemLocationLabel(world, selectedNode.data);
    relationsDetails.innerHTML = `
      <div class="relations-detail-card">
        <div class="relations-detail-title">
          <div class="detail-kicker">Objeto</div>
          <h4>${escapeHtml(selectedNode.label)}</h4>
          <div class="relations-detail-subtitle">${escapeHtml(selectedNode.subtitle || '')}</div>
        </div>
        <dl class="relations-detail-list">
          ${renderDetailField('Tipo', getItemTypeLabel(selectedNode.data), 'Sin tipo.')}
          ${renderDetailField('Localizaci\u00f3n', locationLabel, 'Sin localizaci\u00f3n.')}
          ${renderDetailField('Portador', holder ? getCharacterName(holder) : '', 'Sin portador.')}
          ${renderDetailField('Descripci\u00f3n', selectedNode.data.description, 'Sin descripci\u00f3n.')}
        </dl>
        <div class="relations-detail-actions">
          <button id="openSelectedNodeButton" class="action-button" type="button">Abrir objeto</button>
        </div>
        <div class="relations-detail-section">
          <div class="panel-heading">
            <h4>Conexiones</h4>
            <span>${neighbors.length}</span>
          </div>
          ${neighbors.length
            ? `<div class="relations-chip-list">
                ${neighbors
                  .map((neighbor) => {
                    const relationLabel = Array.from(neighbor.types).map((type) => getRelationLabel(type)).join(' \u00b7 ');
                    return `
                      <button type="button" class="relations-chip" data-select-node-id="${escapeHtml(neighbor.id)}">
                        <strong>${escapeHtml(neighbor.label)}</strong>
                        <span>${escapeHtml(relationLabel)}</span>
                      </button>
                    `;
                  })
                  .join('')}
              </div>`
            : '<div class="relations-detail-empty-inline">No tiene conexiones.</div>'}
        </div>
      </div>
    `;
  }

  document.getElementById('openSelectedNodeButton')?.addEventListener('click', () => {
    openNodeInParent(selectedNode);
  });

  relationsDetails.querySelectorAll('[data-select-node-id]').forEach((button) => {
    button.addEventListener('click', () => {
      setSelectedNodeId(button.dataset.selectNodeId || null);
    });
  });
}

function renderGraphWithSelection() {
  renderEdgePositions();
  updateGraphHighlights();
  renderDetailsPanel();
}

function setupGraphInteractions() {
  if (!relationsGraphStage) return;

  relationsGraphStage.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    if (event.target.closest('.relation-node')) return;

    const startPoint = getGraphStagePoint(event.clientX, event.clientY);
    graphPanState = {
      pointerId: event.pointerId,
      startX: startPoint.x,
      startY: startPoint.y,
      offsetX: graphViewState.offsetX,
      offsetY: graphViewState.offsetY,
      moved: false
    };
    relationsGraphStage.classList.add('is-panning');
    relationsGraphStage.setPointerCapture(event.pointerId);
  });

  relationsGraphStage.addEventListener('pointermove', (event) => {
    if (graphNodeDragState && graphNodeDragState.pointerId === event.pointerId) {
      const point = getGraphCoordinatesFromStagePoint(event.clientX, event.clientY);
      const deltaX = point.x - graphNodeDragState.startX;
      const deltaY = point.y - graphNodeDragState.startY;

      if (!graphNodeDragState.moved && Math.hypot(deltaX, deltaY) >= GRAPH_NODE_DRAG_THRESHOLD) {
        graphNodeDragState.moved = true;
      }

      if (!graphNodeDragState.moved) return;

      graphNodeDragState.targetX = graphNodeDragState.nodeStartX + deltaX;
      graphNodeDragState.targetY = graphNodeDragState.nodeStartY + deltaY;
      scheduleGraphAnimation();
      return;
    }

    if (!graphPanState || graphPanState.pointerId !== event.pointerId) return;

    const point = getGraphStagePoint(event.clientX, event.clientY);
    const deltaX = point.x - graphPanState.startX;
    const deltaY = point.y - graphPanState.startY;

    if (!graphPanState.moved && Math.hypot(deltaX, deltaY) >= GRAPH_POINTER_MOVE_THRESHOLD) {
      graphPanState.moved = true;
    }

    if (!graphPanState.moved) return;

    graphViewState.offsetX = graphPanState.offsetX + deltaX;
    graphViewState.offsetY = graphPanState.offsetY + deltaY;
    syncGraphView();
  });

  const endPan = (event) => {
    if (graphNodeDragState && graphNodeDragState.pointerId === event.pointerId) {
      const draggedNodeId = graphNodeDragState.nodeId;
      if (graphNodeDragState.sourceElement?.hasPointerCapture(event.pointerId)) {
        try {
          graphNodeDragState.sourceElement.releasePointerCapture(event.pointerId);
        } catch (error) {
          // ignore
        }
      }

      if (graphNodeDragState.moved) {
        graphNodeClickSuppressedId = draggedNodeId;
        window.setTimeout(() => {
          if (graphNodeClickSuppressedId === draggedNodeId) {
            graphNodeClickSuppressedId = null;
          }
        }, 0);
      }

      graphNodeDragState = null;
      scheduleGraphAnimation();
      return;
    }

    if (!graphPanState || graphPanState.pointerId !== event.pointerId) return;
    if (relationsGraphStage?.hasPointerCapture(event.pointerId)) {
      relationsGraphStage.releasePointerCapture(event.pointerId);
    }
    resetGraphPanIfNeeded();
  };

  relationsGraphStage.addEventListener('pointerup', endPan);
  relationsGraphStage.addEventListener('pointercancel', endPan);

  relationsGraphStage.addEventListener(
    'wheel',
    (event) => {
      if (!graphState || !graphState.nodes.length) return;
      event.preventDefault();
      const point = getGraphStagePoint(event.clientX, event.clientY);
      const direction = event.deltaY < 0 ? 1 : -1;
      const zoomFactor = direction > 0 ? 1 + GRAPH_ZOOM_STEP : 1 - GRAPH_ZOOM_STEP;
      zoomGraphViewBy(zoomFactor, point.x, point.y);
    },
    { passive: false }
  );
}

function handleResize() {
  if (!graphState) {
    renderGraph(true);
    return;
  }

  renderGraph(false);
}

function init() {
  loadWorlds();

  graphFullscreenButton?.addEventListener('click', () => {
    setGraphFullscreen(!graphFullscreen);
  });

  graphZoomInButton?.addEventListener('click', () => {
    const rect = relationsGraphStage?.getBoundingClientRect();
    if (!rect) return;
    zoomGraphViewBy(1 + GRAPH_ZOOM_STEP, rect.width / 2, rect.height / 2);
  });

  graphZoomOutButton?.addEventListener('click', () => {
    const rect = relationsGraphStage?.getBoundingClientRect();
    if (!rect) return;
    zoomGraphViewBy(1 - GRAPH_ZOOM_STEP, rect.width / 2, rect.height / 2);
  });

  graphResetViewButton?.addEventListener('click', () => {
    resetGraphView();
  });

  setupGraphInteractions();

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && graphFullscreen) {
      setGraphFullscreen(false);
    }
  });

  graphResizeObserver = new ResizeObserver(() => {
    handleResize();
  });

  if (relationsGraphStage) {
    graphResizeObserver.observe(relationsGraphStage);
  }

  window.addEventListener('resize', handleResize);

  renderGraph(true);
}

window.addEventListener('DOMContentLoaded', init);
