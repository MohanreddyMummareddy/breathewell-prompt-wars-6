import { configureLocation, selectedLocation } from './location-picker.js';
import { category } from './domain/air-quality.js';
import { savings } from './domain/impact.js';
import { cleanPreferences } from './domain/profile.js';
import { buildPlan } from './domain/recommendations.js';
import { createStorage } from './state/storage.js';
import { createAirQualityService } from './services/air-quality.js';
import { renderActionCards, renderActionPlan } from './features/actions.js';
import { initializeAssistant } from './features/assistant.js';
import { $, element } from './ui/dom.js';

let browserStorage;
try {
  browserStorage = window.localStorage;
} catch {
  /* Private browsers can disable storage. */
}
const storage = createStorage(browserStorage);
const restored = storage.load();
let profile = { ...restored.profile, aqi: null, lowerBound: false, airDataKind: 'Not checked' };
let completed = restored.completed;
let filter = 'all';
let actions = buildPlan(profile);
const airService = createAirQualityService();
let airVersion = 0;

function notify(text) {
  $('#toast').textContent = text;
  $('#toast').style.display = 'block';
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => {
    $('#toast').style.display = 'none';
  }, 7000);
}

function save() {
  if (!storage.save(profile, completed))
    notify('Device storage is unavailable. Changes last for this visit.');
}

function toggleAction(id) {
  const focusId = document.activeElement?.id;
  completed = completed.includes(id)
    ? completed.filter((value) => value !== id)
    : [...completed, id];
  save();
  renderActions();
  if (focusId) document.getElementById(focusId)?.focus();
}

function renderActions() {
  actions = buildPlan(profile);
  renderActionCards(actions, completed, filter, toggleAction);
  renderActionPlan(actions, completed, toggleAction);
  const commute = actions.find((action) => action.id === 'commute');
  $('#daily-title').textContent = commute.title;
  $('#daily-copy').textContent = commute.text;
  $('#daily-saving').textContent =
    commute.potentialCarbonKg === null
      ? 'Fewer unnecessary trips'
      : `${commute.potentialCarbonKg} kg CO₂`;
  $('#daily-assumption').textContent =
    commute.potentialCarbonKg === null
      ? 'No carbon saving claimed without a matching baseline'
      : 'Potential saving per solo-car trip replaced · 0.17 kg CO₂/km';
  $('#add-commute').textContent = completed.includes('commute')
    ? 'Added to your day ✓'
    : 'Add to my day +';
  $('#add-commute').setAttribute('aria-pressed', String(completed.includes('commute')));
  $('#plan-progress').textContent =
    `${completed.length} of ${actions.length} actions marked complete today. Completion is self-reported, not a measured exposure or emissions reduction.`;
}

function aqiPosition(aqi) {
  const edges = [0, 50, 100, 200, 300, 400, 500];
  const band = edges.slice(1).findIndex((edge) => aqi <= edge);
  return Math.min(99, ((band + (aqi - edges[band]) / (edges[band + 1] - edges[band])) * 100) / 6);
}

function renderProfile() {
  const known = Number.isFinite(profile.aqi);
  $('#header-city').textContent = profile.city;
  $('#air-city').textContent = profile.city;
  $('#aqi-value').textContent = known
    ? `${profile.lowerBound ? '≥' : ''}${Math.round(profile.aqi)}`
    : '—';
  $('#severity').textContent = known ? category(profile.aqi) : 'Not checked';
  $('#scale-marker').hidden = !known;
  if (known) $('#scale-marker').style.left = aqiPosition(profile.aqi) + '%';
  $('#data-badge').textContent = known ? 'CPCB-scale estimate' : 'No reading loaded';
  $('#air-advice').textContent = known
    ? `24-hour modeled estimate. ${profile.aqi > 200 || (profile.sensitive && profile.aqi > 100) ? 'Prioritize cleaner indoor air and reduce strenuous roadside activity.' : 'Check official advisories before outdoor activity.'}`
    : 'Refresh local air for your selected place. Your plan uses precautions until a reading is available.';
  $('#air-time').textContent = profile.endTime
    ? `24h to ${profile.endTime.replace('T', ' ').slice(0, 19)} UTC · Open-Meteo/CAMS · ${Object.keys(profile.subIndices).length} pollutants`
    : 'No measurement claimed. Select your place and refresh.';
  $('#impact-km').value = Math.min(100, Math.max(1, profile.commute));
  updateImpact();
  renderActions();
}

function navigate(name) {
  for (const section of document.querySelectorAll('.page'))
    section.classList.toggle('hidden', section.id !== `${name}-page`);
  for (const button of document.querySelectorAll('.nav')) {
    const active = button.dataset.page === name;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  $('#page-label').textContent = {
    today: 'My day',
    plan: 'My action plan',
    indoor: 'Indoor toolkit',
    impact: 'My impact',
  }[name];
  const heading = $(`#${name}-page`).querySelector('h2');
  if (heading) {
    heading.tabIndex = -1;
    heading.focus();
  }
}

document
  .querySelectorAll('[data-page]')
  .forEach((button) => button.addEventListener('click', () => navigate(button.dataset.page)));
document
  .querySelectorAll('[data-go]')
  .forEach((button) => button.addEventListener('click', () => navigate(button.dataset.go)));
document.querySelectorAll('[data-filter]').forEach((button) => {
  button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
  button.addEventListener('click', () => {
    filter = button.dataset.filter;
    document.querySelectorAll('.chip').forEach((chip) => {
      chip.classList.toggle('selected', chip === button);
      chip.setAttribute('aria-pressed', String(chip === button));
    });
    renderActions();
  });
});

function openPreferences() {
  configureLocation(profile);
  for (const [id, key] of [
    ['commute-input', 'commute'],
    ['budget-input', 'budget'],
    ['travel-input', 'travelMode'],
    ['cooking-input', 'cooking'],
  ])
    $('#' + id).value = profile[key];
  $('#sensitive-input').checked = profile.sensitive;
  $('#purifier-input').checked = profile.purifier;
  $('#profile-dialog').showModal();
}

['profile-open', 'location-open', 'plan-profile'].forEach((id) =>
  $('#' + id).addEventListener('click', openPreferences),
);
$('#profile-close').addEventListener('click', () => $('#profile-dialog').close());
$('#profile-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const place = selectedLocation();
  if (!place) {
    notify('Select your city or matching post office first.');
    return;
  }
  const next = cleanPreferences({
    city: `${place.name}, ${place.state}`,
    place,
    commute: Number($('#commute-input').value),
    budget: $('#budget-input').value,
    sensitive: $('#sensitive-input').checked,
    purifier: $('#purifier-input').checked,
    travelMode: $('#travel-input').value,
    cooking: $('#cooking-input').value,
  });
  const changed =
    next.place?.latitude !== profile.place?.latitude ||
    next.place?.longitude !== profile.place?.longitude;
  if (changed) {
    airVersion++;
    airService.cancel();
    profile = { ...next, aqi: null, lowerBound: false, airDataKind: 'Not checked' };
  } else profile = { ...profile, ...next };
  save();
  renderProfile();
  $('#profile-dialog').close();
  notify('Preferences saved. Your routines and impact explanations have been updated.');
});

async function refreshAir() {
  const version = ++airVersion,
    place = profile.place;
  const button = $('#refresh-air');
  button.disabled = true;
  button.textContent = 'Checking local air…';
  $('#air-status').textContent = 'Loading modeled air conditions…';
  try {
    const reading = await airService.refresh(place);
    if (version !== airVersion) return;
    profile = { ...profile, ...reading };
    renderProfile();
    $('#air-status').textContent =
      'Updated. This is a modeled estimate, not an official CPCB station reading.';
  } catch (error) {
    if (version !== airVersion || error.name === 'AbortError') return;
    $('#air-status').textContent =
      error.name === 'TimeoutError' ? 'Air data request timed out. Please retry.' : error.message;
  } finally {
    button.disabled = false;
    button.textContent = '↻ Refresh local air';
  }
}
$('#refresh-air').addEventListener('click', () => {
  void refreshAir();
});
$('#aqi-info').addEventListener('click', () => {
  const details = $('#aqi-explanation');
  details.hidden = !details.hidden;
  $('#aqi-info').setAttribute('aria-expanded', String(!details.hidden));
});
$('#add-commute').addEventListener('click', () => toggleAction('commute'));
$('#community-link').addEventListener('click', () => navigate('impact'));

function updateImpact() {
  const km = Number($('#impact-km').value),
    days = Number($('#impact-days').value);
  $('#km-output').textContent = `${km} km`;
  $('#days-output').textContent = `${days} days`;
  $('#impact-total').replaceChildren(
    document.createTextNode(`${savings(km, days)} `),
    element('small', '', 'kg'),
  );
}
$('#impact-km').addEventListener('input', updateImpact);
$('#impact-days').addEventListener('input', updateImpact);

$('#download-plan').addEventListener('click', () => {
  const condition =
    profile.aqi === null ? 'Not checked' : `${profile.lowerBound ? 'at least ' : ''}${profile.aqi}`;
  const content =
    `Breathewell daily plan — ${profile.city}\nIndian AQI: ${condition}; ${profile.airDataKind}\n\n` +
    actions
      .map(
        (action) =>
          `${completed.includes(action.id) ? '[x]' : '[ ]'} ${action.title}\n${action.text}\nWhy for you: ${action.reason}\nDirect impact: ${action.impact}\nSource: ${action.source}`,
      )
      .join('\n\n') +
    '\n\nGeneral guidance, not medical advice. Completion is self-reported. Model estimates are not official station readings.';
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const link = element('a');
  link.href = url;
  link.download = 'breathewell-daily-plan.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$('#date').textContent = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  timeZone: 'Asia/Kolkata',
}).format(new Date());
initializeAssistant(() => profile);
renderProfile();
