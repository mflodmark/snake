import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeededRng, getDailySeedLabel } from '../daily-seed.js';

test('getDailySeedLabel uses UTC date format', () => {
  const date = new Date('2026-02-18T23:59:59.000Z');
  assert.equal(getDailySeedLabel(date), '2026-02-18');
});

test('same seed label yields same random sequence', () => {
  const a = createSeededRng('2026-02-18');
  const b = createSeededRng('2026-02-18');
  const seqA = [a(), a(), a(), a(), a()];
  const seqB = [b(), b(), b(), b(), b()];
  assert.deepEqual(seqA, seqB);
});

test('different seed labels yield different sequence', () => {
  const a = createSeededRng('2026-02-18');
  const b = createSeededRng('2026-02-19');
  const seqA = [a(), a(), a()];
  const seqB = [b(), b(), b()];
  assert.notDeepEqual(seqA, seqB);
});
