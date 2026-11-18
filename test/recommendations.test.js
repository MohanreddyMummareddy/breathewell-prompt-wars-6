import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan } from '../public/domain/recommendations.js';
import { cleanPreferences, assistantContext } from '../public/domain/profile.js';
import { guidance } from '../public/domain/guidance.js';
import { savings } from '../public/domain/impact.js';

const base = { ...cleanPreferences(), aqi: 250 };
test('poor air changes the movement routine and explains the reason', () => {
  const poor = buildPlan(base)[0],
    good = buildPlan({ ...base, aqi: 40 })[0];
  assert.notEqual(poor.title, good.title);
  assert.match(poor.reason, /250/);
  assert.match(poor.impact, /exposure/);
});
test('unknown air conditions never become an invented reading', () => {
  const item = buildPlan({ ...base, aqi: null })[0];
  assert.match(item.title, /Check/);
  assert.match(item.reason, /No air reading/);
});
test('sensitive households get more cautious guidance at moderately polluted AQI', () => {
  assert.notEqual(
    buildPlan({ ...base, aqi: 140, sensitive: true })[0].title,
    buildPlan({ ...base, aqi: 140, sensitive: false })[0].title,
  );
});
test('commute carbon baseline only applies to solo-car journeys', () => {
  assert.equal(
    buildPlan({ ...base, travelMode: 'car', commute: 10 }).find((a) => a.id === 'commute')
      .potentialCarbonKg,
    1.7,
  );
  for (const travelMode of ['public', 'two-wheeler', 'remote', 'active'])
    assert.equal(
      buildPlan({ ...base, travelMode }).find((a) => a.id === 'commute').potentialCarbonKg,
      null,
    );
  assert.equal(
    buildPlan({ ...base, commute: 0 }).find((a) => a.id === 'commute').potentialCarbonKg,
    null,
  );
});
test('indoor routine changes for filtration access and cooking fuel', () => {
  const noFilter = buildPlan({ ...base, purifier: false, cooking: 'gas' })[1];
  const filtered = buildPlan({ ...base, purifier: true, cooking: 'electric' })[1];
  assert.notEqual(noFilter.title, filtered.title);
  assert.match(noFilter.reason, /no-cost/);
  assert.match(noFilter.impact, /combustion/);
  assert.match(filtered.impact, /electric cooking/);
});
test('every routine explains fit, direct impact, and source', () => {
  for (const item of buildPlan(base)) {
    assert.ok(item.reason);
    assert.ok(item.impact);
    assert.match(item.source, /^https:\/\//);
  }
});
test('malformed preferences are normalized and model context omits postal coordinates', () => {
  const profile = cleanPreferences({
    commute: -5,
    budget: 'expensive',
    sensitive: 'false',
    travelMode: 'spaceship',
    city: '<script>',
  });
  assert.equal(profile.commute, 10);
  assert.equal(profile.sensitive, true);
  assert.equal(profile.travelMode, 'unknown');
  const context = assistantContext({
    ...base,
    secret: 'test-secret',
    place: { latitude: 28, longitude: 77, pin: '110001' },
  });
  assert.ok(!('place' in context));
  assert.ok(!('secret' in context));
  assert.ok(!('pin' in context));
});
test('breathewell questions are not falsely treated as urgent symptoms', () => {
  assert.doesNotMatch(guidance(base, 'How can Breathewell help my commute?'), /seek urgent/);
  assert.match(guidance(base, 'I cannot breathe'), /urgent local medical/);
});
test('carbon calculator rejects invalid arithmetic inputs', () => {
  for (const [km, days] of [
    [-1, 5],
    [Infinity, 5],
    [10, 8],
    [10, -1],
  ])
    assert.throws(() => savings(km, days), RangeError);
});
