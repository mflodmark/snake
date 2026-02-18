import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addHighScore,
  qualifiesForHighScore,
  sanitizeName,
  sortHighScores,
} from '../highscores.js';

test('sanitizeName trims and falls back to Player', () => {
  assert.equal(sanitizeName('  Alice  '), 'Alice');
  assert.equal(sanitizeName('   '), 'Player');
});

test('qualifiesForHighScore requires positive score', () => {
  assert.equal(qualifiesForHighScore([], 0), false);
  assert.equal(qualifiesForHighScore([], 5), true);
});

test('qualifiesForHighScore compares against current floor when full', () => {
  const entries = [
    { name: 'A', score: 10, createdAt: 1 },
    { name: 'B', score: 8, createdAt: 2 },
    { name: 'C', score: 6, createdAt: 3 },
  ];
  assert.equal(qualifiesForHighScore(entries, 6), false);
  assert.equal(qualifiesForHighScore(entries, 7), true);
});

test('addHighScore inserts, sorts desc, and keeps top 3', () => {
  const base = [
    { name: 'A', score: 10, createdAt: 1 },
    { name: 'B', score: 8, createdAt: 2 },
    { name: 'C', score: 6, createdAt: 3 },
  ];
  const next = addHighScore(base, 'D', 12);
  assert.equal(next.length, 3);
  assert.deepEqual(next.map((entry) => entry.score), [12, 10, 8]);
});

test('sortHighScores uses createdAt as tie-breaker', () => {
  const sorted = sortHighScores([
    { name: 'Late', score: 9, createdAt: 2 },
    { name: 'Early', score: 9, createdAt: 1 },
  ]);
  assert.equal(sorted[0].name, 'Early');
});
