import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  getTickMs,
  queueDirection,
  spawnFood,
  spawnPortals,
  stepGame,
} from '../snake-core.js';

test('snake moves one tile in current direction', () => {
  const state = {
    ...createInitialState(10, () => 0),
    snake: [
      { x: 4, y: 5 },
      { x: 3, y: 5 },
      { x: 2, y: 5 },
    ],
    direction: 'RIGHT',
    pendingDirection: 'RIGHT',
  };

  const next = stepGame(state, () => 0);
  assert.deepEqual(next.snake[0], { x: 5, y: 5 });
  assert.equal(next.snake.length, 3);
});

test('snake grows and score increments when normal food is eaten', () => {
  const state = {
    ...createInitialState(8, () => 0),
    snake: [
      { x: 4, y: 4 },
      { x: 3, y: 4 },
      { x: 2, y: 4 },
    ],
    direction: 'RIGHT',
    pendingDirection: 'RIGHT',
    food: { x: 5, y: 4, type: 'normal', ttl: null },
    score: 0,
    combo: 0,
    comboTicksLeft: 0,
  };

  const next = stepGame(state, () => 0);
  assert.equal(next.score, 1);
  assert.equal(next.snake.length, 4);
  assert.deepEqual(next.snake[0], { x: 5, y: 4 });
});

test('gold food enables temporary wrap mode and gives bonus score', () => {
  const state = {
    ...createInitialState(8, () => 0),
    snake: [
      { x: 4, y: 4 },
      { x: 3, y: 4 },
      { x: 2, y: 4 },
    ],
    direction: 'RIGHT',
    pendingDirection: 'RIGHT',
    food: { x: 5, y: 4, type: 'gold', ttl: 10 },
    score: 0,
    combo: 0,
    comboTicksLeft: 0,
    wrapTicksLeft: 0,
  };

  const next = stepGame(state, () => 0.9);
  assert.equal(next.score, 3);
  assert.equal(next.wrapTicksLeft > 0, true);
});

test('wrap mode allows crossing boundaries', () => {
  const state = {
    ...createInitialState(6, () => 0),
    snake: [{ x: 5, y: 2 }],
    direction: 'RIGHT',
    pendingDirection: 'RIGHT',
    wrapTicksLeft: 5,
    food: { x: 0, y: 0, type: 'normal', ttl: null },
  };

  const next = stepGame(state, () => 0);
  assert.equal(next.isGameOver, false);
  assert.deepEqual(next.snake[0], { x: 0, y: 2 });
});

test('snake collides with wall and game ends without wrap mode', () => {
  const state = {
    ...createInitialState(6, () => 0),
    snake: [{ x: 5, y: 2 }],
    direction: 'RIGHT',
    pendingDirection: 'RIGHT',
    wrapTicksLeft: 0,
    food: { x: 0, y: 0, type: 'normal', ttl: null },
  };

  const next = stepGame(state, () => 0);
  assert.equal(next.isGameOver, true);
});

test('snake collides with itself and game ends', () => {
  const state = {
    ...createInitialState(8, () => 0),
    snake: [
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 3, y: 2 },
    ],
    direction: 'LEFT',
    pendingDirection: 'DOWN',
  };

  const next = stepGame(state, () => 0);
  assert.equal(next.isGameOver, true);
});

test('food spawns only on open cells', () => {
  const snake = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
  ];

  const food = spawnFood(3, snake, () => 0);
  assert.notDeepEqual({ x: food.x, y: food.y }, { x: 0, y: 0 });
  assert.notDeepEqual({ x: food.x, y: food.y }, { x: 1, y: 0 });
  assert.notDeepEqual({ x: food.x, y: food.y }, { x: 2, y: 0 });
});

test('gold food expires and respawns', () => {
  const state = {
    ...createInitialState(8, () => 0),
    snake: [
      { x: 4, y: 4 },
      { x: 3, y: 4 },
      { x: 2, y: 4 },
    ],
    direction: 'RIGHT',
    pendingDirection: 'RIGHT',
    food: { x: 7, y: 7, type: 'gold', ttl: 1 },
  };

  const next = stepGame(state, () => 0.9);
  assert.equal(next.food.type, 'normal');
});

test('portal entry teleports to paired portal exit', () => {
  const state = {
    ...createInitialState(8, () => 0),
    snake: [
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
    direction: 'RIGHT',
    pendingDirection: 'RIGHT',
    portals: {
      a: { x: 2, y: 1 },
      b: { x: 5, y: 4 },
      ttl: 8,
    },
    food: { x: 7, y: 7, type: 'normal', ttl: null },
  };

  const next = stepGame(state, () => 0);
  assert.deepEqual(next.snake[0], { x: 5, y: 4 });
  assert.equal(next.portals.ttl, 7);
});

test('portal pair expires when ttl reaches zero', () => {
  const state = {
    ...createInitialState(8, () => 0),
    snake: [
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
    direction: 'RIGHT',
    pendingDirection: 'RIGHT',
    portals: {
      a: { x: 7, y: 7 },
      b: { x: 6, y: 6 },
      ttl: 1,
    },
    food: { x: 7, y: 0, type: 'normal', ttl: null },
  };

  const next = stepGame(state, () => 0);
  assert.equal(next.portals, null);
});

test('spawned food does not overlap active portals', () => {
  const state = {
    ...createInitialState(8, () => 0),
    snake: [
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
    ],
    direction: 'RIGHT',
    pendingDirection: 'RIGHT',
    food: { x: 4, y: 3, type: 'normal', ttl: null },
    portals: {
      a: { x: 0, y: 0 },
      b: { x: 1, y: 0 },
      ttl: 10,
    },
  };

  const next = stepGame(state, () => 0);
  assert.notDeepEqual({ x: next.food.x, y: next.food.y }, state.portals.a);
  assert.notDeepEqual({ x: next.food.x, y: next.food.y }, state.portals.b);
});

test('spawnPortals avoids snake and food tiles', () => {
  const snake = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
  ];
  const food = { x: 0, y: 1, type: 'normal', ttl: null };
  const portals = spawnPortals(4, snake, food, () => 0);
  assert.notDeepEqual(portals.a, { x: 0, y: 0 });
  assert.notDeepEqual(portals.a, { x: 0, y: 1 });
  assert.notDeepEqual(portals.b, { x: 0, y: 0 });
  assert.notDeepEqual(portals.b, { x: 0, y: 1 });
});

test('reverse direction input is ignored', () => {
  const state = {
    ...createInitialState(10, () => 0),
    direction: 'RIGHT',
    pendingDirection: 'RIGHT',
  };

  const next = queueDirection(state, 'LEFT');
  assert.equal(next.pendingDirection, 'RIGHT');
});

test('combo increases points for quick consecutive eats', () => {
  let state = {
    ...createInitialState(10, () => 0),
    snake: [
      { x: 4, y: 5 },
      { x: 3, y: 5 },
      { x: 2, y: 5 },
    ],
    direction: 'RIGHT',
    pendingDirection: 'RIGHT',
    food: { x: 5, y: 5, type: 'normal', ttl: null },
    score: 0,
    combo: 0,
    comboTicksLeft: 0,
  };

  state = stepGame(state, () => 0.9);
  state.food = { x: 6, y: 5, type: 'normal', ttl: null };
  state = stepGame(state, () => 0.9);

  assert.equal(state.score, 3);
  assert.equal(state.combo, 2);
});

test('tick speed increases with score floor limit', () => {
  const state = createInitialState(10, () => 0);
  const faster = { ...state, score: 20 };
  assert.equal(getTickMs(state) > getTickMs(faster), true);
  assert.equal(getTickMs({ ...state, score: 999 }), 75);
});
