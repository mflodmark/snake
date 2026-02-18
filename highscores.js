export const MAX_HIGH_SCORES = 3;
export const HIGH_SCORE_STORAGE_KEY = 'snake-highscores-v1';

function safeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

export function sanitizeName(name) {
  const trimmed = String(name ?? '').trim().slice(0, 16);
  return trimmed || 'Player';
}

export function sortHighScores(entries) {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.createdAt - b.createdAt;
  });
}

export function qualifiesForHighScore(entries, score, max = MAX_HIGH_SCORES) {
  const normalizedScore = safeNumber(score);
  if (normalizedScore <= 0) return false;
  if (entries.length < max) return true;
  const floor = Math.min(...entries.map((entry) => safeNumber(entry.score)));
  return normalizedScore > floor;
}

export function addHighScore(entries, name, score, max = MAX_HIGH_SCORES) {
  const next = [
    ...entries,
    {
      name: sanitizeName(name),
      score: safeNumber(score),
      createdAt: Date.now(),
    },
  ];
  return sortHighScores(next).slice(0, max);
}

export function loadHighScores(storage, key = HIGH_SCORE_STORAGE_KEY) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const normalized = parsed
      .map((entry, index) => ({
        name: sanitizeName(entry.name),
        score: safeNumber(entry.score),
        createdAt: safeNumber(entry.createdAt) || index,
      }))
      .filter((entry) => entry.score > 0);
    return sortHighScores(normalized).slice(0, MAX_HIGH_SCORES);
  } catch {
    return [];
  }
}

export function saveHighScores(storage, entries, key = HIGH_SCORE_STORAGE_KEY) {
  try {
    storage.setItem(key, JSON.stringify(sortHighScores(entries).slice(0, MAX_HIGH_SCORES)));
  } catch {
    // Ignore storage failures to keep gameplay uninterrupted.
  }
}
