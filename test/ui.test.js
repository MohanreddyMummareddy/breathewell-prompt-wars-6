import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { renderActionCards, renderActionPlan } from '../public/features/actions.js';
import { buildPlan } from '../public/domain/recommendations.js';
import { cleanPreferences } from '../public/domain/profile.js';

test('rendered actions support filters, pressed state, direct impact and toggle callbacks', () => {
  const previous = globalThis.document;
  const { document, window } = parseHTML(
    '<html><body><div id="action-cards"></div><div id="plan-list"></div></body></html>',
  );
  globalThis.document = document;
  try {
    const actions = buildPlan({ ...cleanPreferences(), aqi: 250 });
    let selected;
    renderActionCards(actions, ['room'], 'indoor', (id) => {
      selected = id;
    });
    assert.equal(document.querySelectorAll('.action-card').length, 1);
    const button = document.querySelector('.action-card button');
    assert.equal(button.getAttribute('aria-pressed'), 'true');
    button.dispatchEvent(new window.Event('click'));
    assert.equal(selected, 'room');
    assert.ok(document.querySelector('details summary'));
    assert.match(document.querySelector('details').textContent, /Direct impact/);
    renderActionPlan(actions, ['room'], (id) => {
      selected = id;
    });
    const check = document.querySelector('#plan-room');
    assert.equal(check.checked, true);
    assert.equal(document.querySelector('label[for="plan-room"]').textContent, actions[1].title);
    check.dispatchEvent(new window.Event('change'));
    assert.equal(selected, 'room');
  } finally {
    globalThis.document = previous;
  }
});

test('untrusted recommendation text is never interpreted as HTML', () => {
  const previous = globalThis.document;
  const { document } = parseHTML('<html><body><div id="action-cards"></div></body></html>');
  globalThis.document = document;
  try {
    const action = {
      ...buildPlan({ ...cleanPreferences(), aqi: 250 })[0],
      title: '<img src=x onerror=alert(1)>',
      reason: '<script>bad()</script>',
    };
    renderActionCards([action], [], 'all', () => {});
    assert.equal(document.querySelectorAll('script,img').length, 0);
    assert.match(document.querySelector('h3').textContent, /<img/);
  } finally {
    globalThis.document = previous;
  }
});

test('page has associated labels, a skip link, unique IDs and no fabricated initial AQI', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const { document } = parseHTML(html);
  const ids = [...document.querySelectorAll('[id]')].map((node) => node.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(document.querySelector('.skip').getAttribute('href'), '#main');
  for (const control of document.querySelectorAll('input,select')) {
    const explicit = document.querySelector(`label[for="${control.id}"]`);
    assert.ok(
      explicit || control.closest('label') || control.hasAttribute('aria-label'),
      `Missing label: ${control.id}`,
    );
  }
  assert.equal(document.querySelector('#severity').textContent, 'Not checked');
  assert.ok(!document.querySelector('#aqi-value').textContent.includes('186'));
  assert.equal(document.querySelector('#air-status').getAttribute('role'), 'status');
});

test('application bootstrap renders a complete no-reading dashboard without network calls', async () => {
  const previous = { document: globalThis.document, window: globalThis.window };
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const { document, window } = parseHTML(html);
  globalThis.document = document;
  globalThis.window = window;
  try {
    await import('../public/app.js');
    assert.equal(document.querySelectorAll('.action-card').length, 4);
    assert.equal(document.querySelectorAll('.plan-item').length, 4);
    assert.equal(document.querySelector('#severity').textContent, 'Not checked');
    assert.equal(document.querySelector('#chat-toggle').getAttribute('aria-expanded'), 'false');
    const button = document.querySelector('[data-filter="indoor"]');
    button.dispatchEvent(new window.Event('click'));
    assert.equal(document.querySelectorAll('.action-card').length, 1);
    assert.equal(button.getAttribute('aria-pressed'), 'true');
  } finally {
    globalThis.document = previous.document;
    globalThis.window = previous.window;
  }
});
