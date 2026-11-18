import test from 'node:test';
import assert from 'node:assert/strict';
import { category, savings, guidance, indianSubIndex, indianAqiEstimate } from '../public/logic.js';
test('Indian CPCB AQI category boundaries', () => {
  for (const [value, label] of [
    [0, 'Good'],
    [50, 'Good'],
    [51, 'Satisfactory'],
    [100, 'Satisfactory'],
    [101, 'Moderately polluted'],
    [200, 'Moderately polluted'],
    [201, 'Poor'],
    [300, 'Poor'],
    [301, 'Very poor'],
    [400, 'Very poor'],
    [401, 'Severe'],
    [500, 'Severe'],
  ])
    assert.equal(category(value), label);
  for (const value of [-1, 501, NaN, Infinity]) assert.throws(() => category(value));
});
test('CPCB pollutant interpolation and Severe lower bound', () => {
  assert.equal(indianSubIndex('pm2_5', 45), 75);
  assert.equal(indianSubIndex('pm2_5', 150), 323);
  assert.equal(indianSubIndex('pm10', 250), 200);
  assert.equal(indianSubIndex('pm2_5', 251), 401);
  assert.throws(() => indianSubIndex('pm2_5', -1));
});
test('Indian AQI estimate needs three valid pollutants and at least 16 samples', () => {
  const time = Array.from({ length: 24 }, (_, i) => `2026-11-17T${String(i).padStart(2, '0')}:00`);
  const hourly = {
    time,
    pm2_5: Array(24).fill(45),
    pm10: Array(24).fill(80),
    nitrogen_dioxide: Array(24).fill(20),
  };
  assert.equal(indianAqiEstimate(hourly, '2026-11-17T23:00:00').aqi, 80);
  assert.throws(
    () => indianAqiEstimate({ ...hourly, nitrogen_dioxide: [] }, '2026-11-17T23:00:00'),
    /Insufficient/,
  );
  assert.throws(
    () => indianAqiEstimate({ ...hourly, pm2_5: Array(15).fill(45) }, '2026-11-17T23:00:00'),
    /Insufficient/,
  );
});

test('carbon estimate reflects distance and days with no false health claim', () => {
  assert.equal(savings(10, 5), 8.5);
  assert.equal(savings(0, 5), 0);
  assert.equal(savings(20, 1), 3.4);
});
const p = {
  city: 'Delhi',
  travelMode: 'car',
  commute: 10,
  aqi: 186,
  sensitive: true,
  budget: 'low',
};
test('polluted commutes avoid strenuous roadside exercise', () => {
  assert.match(guidance(p, 'commute'), /avoid strenuous roadside cycling/);
  assert.match(guidance(p, 'commute'), /0.17 kg CO2\/km/);
});
test('urgent symptoms trigger medical escalation', () =>
  assert.match(guidance(p, 'chest pain'), /urgent local medical help/));
test('plants are not recommended as filtration', () =>
  assert.match(guidance(p, 'plants'), /not a substitute/));
test('household and budget tailor default guidance', () => {
  const answer = guidance(p);
  assert.match(answer, /Delhi/);
  assert.match(answer, /no-cost/);
  assert.match(answer, /children/);
});
