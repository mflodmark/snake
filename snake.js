import {
  createInitialState,
  getTickMs,
  queueDirection,
  restartGame,
  stepGame,
  togglePause,
} from './snake-core.js';
import { createSeededRng, getDailySeedLabel } from './daily-seed.js';
import {
  addHighScore,
  loadHighScores,
  qualifiesForHighScore,
  saveHighScores,
} from './highscores.js';

const GRID_SIZE = 16;

const board = document.querySelector('#board');
const scoreEl = document.querySelector('#score');
const comboEl = document.querySelector('#combo');
const modeEl = document.querySelector('#mode');
const seedEl = document.querySelector('#seed');
const statusEl = document.querySelector('#status');
const highscoresEl = document.querySelector('#highscores');
const scoreFormEl = document.querySelector('#score-form');
const nameInputEl = document.querySelector('#name-input');
const pauseBtn = document.querySelector('#pause-btn');
const restartBtn = document.querySelector('#restart-btn');
const dirButtons = Array.from(document.querySelectorAll('[data-dir]'));

let challengeSeed = getDailySeedLabel();
let rng = createSeededRng(challengeSeed);
let state = createInitialState(GRID_SIZE, rng);
let timerId = null;
let highScores = loadHighScores(window.localStorage);
let submittedCurrentRun = false;

board.style.gridTemplateColumns = `repeat(${state.gridSize}, 1fr)`;
board.style.gridTemplateRows = `repeat(${state.gridSize}, 1fr)`;

function render() {
  scoreEl.textContent = String(state.score);
  comboEl.textContent = state.combo > 1 ? `x${state.combo}` : 'x1';
  seedEl.textContent = challengeSeed;
  if (state.wrapTicksLeft > 0) modeEl.textContent = `Wrap (${state.wrapTicksLeft})`;
  else if (state.portals) modeEl.textContent = `Portals (${state.portals.ttl})`;
  else modeEl.textContent = 'Classic';
  pauseBtn.textContent = state.isPaused ? 'Resume' : 'Pause';

  if (state.isGameOver) {
    statusEl.textContent = 'Game over. Press Restart to play again.';
  } else if (state.isPaused) {
    statusEl.textContent = 'Paused';
  } else if (state.portals) {
    statusEl.textContent = `Portals open (${state.portals.ttl})`;
  } else if (state.food?.type === 'gold') {
    statusEl.textContent = `Gold food active (${state.food.ttl})`;
  } else {
    statusEl.textContent = '';
  }

  const canSubmit = state.isGameOver && !submittedCurrentRun && qualifiesForHighScore(highScores, state.score);
  scoreFormEl.hidden = !canSubmit;
  if (canSubmit && document.activeElement !== nameInputEl) nameInputEl.focus();

  const snakeSet = new Set(state.snake.map((part) => `${part.x},${part.y}`));
  const foodKey = state.food ? `${state.food.x},${state.food.y}` : null;
  const portalAKey = state.portals ? `${state.portals.a.x},${state.portals.a.y}` : null;
  const portalBKey = state.portals ? `${state.portals.b.x},${state.portals.b.y}` : null;

  const cells = [];
  for (let y = 0; y < state.gridSize; y += 1) {
    for (let x = 0; x < state.gridSize; x += 1) {
      const key = `${x},${y}`;
      let cls = 'cell';
      if (snakeSet.has(key)) cls += ' snake';
      else if (portalAKey === key) cls += ' portal portal-a';
      else if (portalBKey === key) cls += ' portal portal-b';
      else if (foodKey === key) cls += state.food.type === 'gold' ? ' food food-gold' : ' food';
      cells.push(`<div class="${cls}"></div>`);
    }
  }

  board.innerHTML = cells.join('');

  highscoresEl.innerHTML = '';
  if (highScores.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No scores yet';
    highscoresEl.appendChild(li);
  } else {
    for (const entry of highScores) {
      const li = document.createElement('li');
      const name = document.createElement('span');
      const score = document.createElement('strong');
      name.textContent = entry.name;
      score.textContent = String(entry.score);
      li.append(name, score);
      highscoresEl.appendChild(li);
    }
  }
}

function scheduleTick() {
  clearTimeout(timerId);
  timerId = setTimeout(() => {
    state = stepGame(state, rng);
    render();
    scheduleTick();
  }, getTickMs(state));
}

function setDirection(dir) {
  state = queueDirection(state, dir);
  render();
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();

  if (key === ' ') {
    event.preventDefault();
    state = togglePause(state);
    render();
    return;
  }

  const map = {
    arrowup: 'UP',
    w: 'UP',
    arrowdown: 'DOWN',
    s: 'DOWN',
    arrowleft: 'LEFT',
    a: 'LEFT',
    arrowright: 'RIGHT',
    d: 'RIGHT',
  };

  if (map[key]) {
    event.preventDefault();
    setDirection(map[key]);
  }
});

dirButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const dir = button.getAttribute('data-dir');
    setDirection(dir);
  });
});

pauseBtn.addEventListener('click', () => {
  state = togglePause(state);
  render();
});

restartBtn.addEventListener('click', () => {
  challengeSeed = getDailySeedLabel();
  rng = createSeededRng(challengeSeed);
  state = restartGame(state, rng);
  submittedCurrentRun = false;
  render();
});

scoreFormEl.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!state.isGameOver || submittedCurrentRun) return;
  if (!qualifiesForHighScore(highScores, state.score)) return;
  highScores = addHighScore(highScores, nameInputEl.value, state.score);
  saveHighScores(window.localStorage, highScores);
  submittedCurrentRun = true;
  scoreFormEl.reset();
  render();
});

render();
scheduleTick();
