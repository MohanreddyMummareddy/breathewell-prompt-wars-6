import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorage, indiaDay } from '../public/state/storage.js';
import { cleanPreferences } from '../public/domain/profile.js';

function memoryStorage() {
  const data = new Map();
  return { getItem: (key) => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
}
test('daily checklists use India midnight rather than host timezone', () => {
  assert.equal(indiaDay(new Date('2026-11-17T18:29:59Z')), '2026-11-17');
  assert.equal(indiaDay(new Date('2026-11-17T18:30:00Z')), '2026-11-18');
});
test('preferences persist but a past day checklist resets', () => {
  const memory = memoryStorage();
  let now = new Date('2026-11-17T10:00:00Z');
  const store = createStorage(memory, () => now);
  assert.equal(store.save({ ...cleanPreferences(), travelMode: 'remote' }, ['move']), true);
  assert.deepEqual(store.load().completed, ['move']);
  assert.equal(store.load().profile.travelMode, 'remote');
  now = new Date('2026-11-18T10:00:00Z');
  assert.deepEqual(store.load().completed, []);
});
test('blocked or corrupted storage does not break startup', () => {
  const blocked = createStorage({
    getItem() {
      throw Error('blocked');
    },
    setItem() {
      throw Error('blocked');
    },
  });
  assert.equal(blocked.load().profile.city, 'New Delhi');
  assert.equal(blocked.save(cleanPreferences(), []), false);
  const corrupt = createStorage({ getItem: () => '{bad-json' });
  assert.deepEqual(corrupt.load().completed, []);
});
test('unknown and duplicate completed-action IDs are ignored', () => {
  const store = createStorage({
    getItem: (key) =>
      key.endsWith('actions')
        ? JSON.stringify({ date: indiaDay(), ids: ['move', 'move', 'malicious'] })
        : null,
  });
  assert.deepEqual(store.load().completed, ['move']);
});
