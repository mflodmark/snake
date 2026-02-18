export const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const OPPOSITE = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

const GOLD_CHANCE = 0.14;
const GOLD_TTL = 28;
const WRAP_TICKS_ON_GOLD = 24;
const COMBO_WINDOW = 10;
const PORTAL_CHANCE = 0.22;
const PORTAL_TTL = 36;

function randomCell(gridSize, rng) {
  return {
    x: Math.floor(rng() * gridSize),
    y: Math.floor(rng() * gridSize),
  };
}

export function createInitialState(gridSize = 16, rng = Math.random) {
  const mid = Math.floor(gridSize / 2);
  const snake = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];

  return {
    gridSize,
    snake,
    direction: 'RIGHT',
    pendingDirection: 'RIGHT',
    food: spawnFood(gridSize, snake, rng),
    score: 0,
    combo: 0,
    comboTicksLeft: 0,
    wrapTicksLeft: 0,
    portals: null,
    isGameOver: false,
    isPaused: false,
  };
}

export function canChangeDirection(current, next) {
  if (!DIRECTIONS[next]) return false;
  return OPPOSITE[current] !== next;
}

export function queueDirection(state, nextDirection) {
  if (canChangeDirection(state.direction, nextDirection)) {
    return { ...state, pendingDirection: nextDirection };
  }
  return state;
}

export function spawnFood(gridSize, snake, rng = Math.random, blockedCells = []) {
  const occupied = new Set(snake.map((part) => `${part.x},${part.y}`));
  for (const blocked of blockedCells) {
    occupied.add(`${blocked.x},${blocked.y}`);
  }
  const openCells = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) openCells.push({ x, y });
    }
  }

  if (openCells.length === 0) return null;
  const idx = Math.floor(rng() * openCells.length);
  const pos = openCells[idx];
  const isGold = rng() < GOLD_CHANCE;

  return {
    ...pos,
    type: isGold ? 'gold' : 'normal',
    ttl: isGold ? GOLD_TTL : null,
  };
}

export function spawnPortals(gridSize, snake, food, rng = Math.random) {
  const occupied = new Set(snake.map((part) => `${part.x},${part.y}`));
  if (food) occupied.add(`${food.x},${food.y}`);
  const openCells = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) openCells.push({ x, y });
    }
  }

  if (openCells.length < 2) return null;

  const firstIdx = Math.floor(rng() * openCells.length);
  const a = openCells[firstIdx];
  openCells.splice(firstIdx, 1);
  const secondIdx = Math.floor(rng() * openCells.length);
  const b = openCells[secondIdx];

  return { a, b, ttl: PORTAL_TTL };
}

function samePos(a, b) {
  return a.x === b.x && a.y === b.y;
}

function wrapPosition(pos, gridSize) {
  return {
    x: (pos.x + gridSize) % gridSize,
    y: (pos.y + gridSize) % gridSize,
  };
}

function isOutOfBounds(pos, gridSize) {
  return pos.x < 0 || pos.x >= gridSize || pos.y < 0 || pos.y >= gridSize;
}

function scoreForFood(foodType, combo) {
  const base = foodType === 'gold' ? 3 : 1;
  return base * combo;
}

export function getTickMs(state) {
  return Math.max(75, 140 - state.score * 3);
}

export function stepGame(state, rng = Math.random) {
  if (state.isGameOver || state.isPaused) return state;

  const direction = canChangeDirection(state.direction, state.pendingDirection)
    ? state.pendingDirection
    : state.direction;

  const delta = DIRECTIONS[direction];
  const head = state.snake[0];
  let nextHead = { x: head.x + delta.x, y: head.y + delta.y };

  if (state.wrapTicksLeft > 0) {
    nextHead = wrapPosition(nextHead, state.gridSize);
  } else if (isOutOfBounds(nextHead, state.gridSize)) {
    return { ...state, direction, isGameOver: true };
  }

  let portals = state.portals;
  if (portals) {
    if (samePos(nextHead, portals.a)) nextHead = { ...portals.b };
    else if (samePos(nextHead, portals.b)) nextHead = { ...portals.a };
  }

  const eatingFood = state.food && samePos(nextHead, state.food);
  const bodyToCheck = eatingFood ? state.snake : state.snake.slice(0, -1);

  if (bodyToCheck.some((part) => samePos(part, nextHead))) {
    return { ...state, direction, isGameOver: true };
  }

  const snake = [nextHead, ...state.snake];
  if (!eatingFood) snake.pop();

  let comboTicksLeft = Math.max(0, state.comboTicksLeft - 1);
  let combo = comboTicksLeft > 0 ? state.combo : 0;
  let wrapTicksLeft = Math.max(0, state.wrapTicksLeft - 1);
  let score = state.score;
  let food = state.food;
  if (portals) {
    const ttl = portals.ttl - 1;
    portals = ttl > 0 ? { ...portals, ttl } : null;
  }

  if (eatingFood) {
    combo = state.comboTicksLeft > 0 ? state.combo + 1 : 1;
    comboTicksLeft = COMBO_WINDOW;
    score += scoreForFood(state.food.type, combo);
    const blocked = portals ? [portals.a, portals.b] : [];
    food = spawnFood(state.gridSize, snake, rng, blocked);

    if (state.food.type === 'gold') {
      wrapTicksLeft = WRAP_TICKS_ON_GOLD;
    }

    if (!portals && rng() < PORTAL_CHANCE) {
      portals = spawnPortals(state.gridSize, snake, food, rng);
    }
  } else if (food && food.type === 'gold') {
    const ttl = food.ttl - 1;
    const blocked = portals ? [portals.a, portals.b] : [];
    food = ttl > 0 ? { ...food, ttl } : spawnFood(state.gridSize, snake, rng, blocked);
  }

  return {
    ...state,
    snake,
    direction,
    pendingDirection: direction,
    food,
    score,
    combo,
    comboTicksLeft,
    wrapTicksLeft,
    portals,
  };
}

export function togglePause(state) {
  if (state.isGameOver) return state;
  return { ...state, isPaused: !state.isPaused };
}

export function restartGame(state, rng = Math.random) {
  return createInitialState(state.gridSize, rng);
}

export function getDebugRandomCell(gridSize, rng = Math.random) {
  return randomCell(gridSize, rng);
}
