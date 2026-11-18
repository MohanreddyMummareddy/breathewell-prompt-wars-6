import test from 'node:test';
import assert from 'node:assert/strict';
import { createAirQualityService } from '../public/services/air-quality.js';
import { indianAqiEstimate } from '../public/domain/air-quality.js';

const now = () => new Date('2026-11-18T23:00:00Z');
const time = Array.from({ length: 24 }, (_, i) => `2026-11-18T${String(i).padStart(2, '0')}:00`);
const hourly = {
  time,
  pm2_5: Array(24).fill(45),
  pm10: Array(24).fill(80),
  nitrogen_dioxide: Array(24).fill(20),
};
test('air service uses selected coordinates and records modeled provenance', async () => {
  const service = createAirQualityService({
    now,
    fetchImpl: async (url) => {
      const parsed = new URL(url);
      assert.equal(parsed.searchParams.get('latitude'), '13.63');
      assert.ok(!parsed.searchParams.has('us_aqi'));
      return { ok: true, json: async () => ({ hourly }) };
    },
  });
  const reading = await service.refresh({ latitude: 13.63, longitude: 79.42 });
  assert.equal(reading.aqi, 80);
  assert.equal(reading.airDataKind, 'Modeled Indian AQI estimate');
  assert.equal(reading.endTime, now().toISOString());
});
test('invalid location and failed provider do not fabricate readings', async () => {
  await assert.rejects(
    createAirQualityService().refresh({ latitude: 0, longitude: 0 }),
    /Choose your/,
  );
  await assert.rejects(
    createAirQualityService({ fetchImpl: async () => ({ ok: false }) }).refresh({
      latitude: 28,
      longitude: 77,
    }),
    /unavailable/,
  );
});
test('duplicate timestamps cannot satisfy the 16-hour completeness requirement', () => {
  const duplicate = { ...hourly, time: Array(24).fill(time[0]) };
  assert.throws(() => indianAqiEstimate(duplicate, now().toISOString()), /Insufficient/);
});
test('future samples are excluded and Severe estimates remain lower bounds', () => {
  const severe = { ...hourly, pm2_5: Array(24).fill(300) };
  const result = indianAqiEstimate(severe, now().toISOString());
  assert.equal(result.aqi, 401);
  assert.equal(result.lowerBound, true);
  assert.throws(() => indianAqiEstimate(hourly, '2026-11-18T10:00:00Z'), /Insufficient/);
});
