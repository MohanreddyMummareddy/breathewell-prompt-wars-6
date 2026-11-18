import test from 'node:test';
import assert from 'node:assert/strict';
import { lookupPin } from '../lib/locations.mjs';
import { cities, validCoordinates } from '../public/locations.js';
test('PIN validation rejects malformed codes without external requests', async () => {
  for (const pin of ['12345', '000000', '12abcd', '517501/../', ''])
    await assert.rejects(
      lookupPin(pin, () => {
        throw Error('must not fetch');
      }),
      (e) => e.status === 400,
    );
});
test('PIN options exclude missing coordinates and mismatched PINs', async () => {
  const office = {
    pincode: '517501',
    office_name: 'Tirupati',
    state: 'Andhra Pradesh',
    district: 'Tirupati',
    latitude: 13.63,
    longitude: 79.42,
  };
  const result = await lookupPin('517501', async () => ({
    ok: true,
    json: async () => ({
      success: true,
      data: {
        post_offices: [office, { ...office, latitude: null }, { ...office, pincode: '110001' }],
      },
    }),
  }));
  assert.equal(result.locations.length, 1);
  assert.equal(result.locations[0].pin, '517501');
  assert.equal(result.unavailable, 2);
});
test('PIN directory failures do not create a fabricated location', async () => {
  await assert.rejects(
    lookupPin('517501', async () => ({ ok: false, status: 503 })),
    /unavailable/,
  );
  assert.deepEqual(await lookupPin('999999', async () => ({ status: 404 })), {
    locations: [],
    unavailable: 0,
  });
});
test('City dropdown options have distinct names and valid coordinates', () => {
  assert.ok(cities.length > 50);
  assert.equal(new Set(cities.map((p) => p.name)).size, cities.length);
  assert.ok(cities.every(validCoordinates));
  assert.ok(cities.some((p) => p.name === 'Tirupati'));
});
