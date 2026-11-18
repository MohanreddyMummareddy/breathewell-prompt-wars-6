import { cities, validCoordinates } from './locations.js';
const select = document.querySelector('#city-input');
const pin = document.querySelector('#pin-input');
const status = document.querySelector('#location-status');
let choices = [],
  requestId = 0;
function addGroup(label, places) {
  const group = document.createElement('optgroup');
  group.label = label;
  for (const place of places) {
    const option = document.createElement('option');
    option.value = String(choices.length);
    option.textContent = `${place.name}, ${place.state}${place.pin ? ' - ' + place.pin : ''}`;
    choices.push(place);
    group.append(option);
  }
  select.append(group);
}
export function configureLocation(profile) {
  requestId++;
  choices = [];
  select.replaceChildren();
  const saved = validCoordinates(profile.place)
    ? profile.place
    : cities.find((p) => p.name === profile.city) || cities.find((p) => p.name === 'New Delhi');
  addGroup('Current selection', [saved]);
  addGroup('Indian cities and towns', cities);
  select.value = '0';
  pin.value = saved.pin || '';
  status.textContent =
    'Choose a listed city, or look up a six-digit PIN and select a matching post office.';
  document.querySelector('#pin-lookup').disabled = false;
}
export function selectedLocation() {
  return select.value === '' ? undefined : choices[Number(select.value)];
}
document.querySelector('#pin-lookup').addEventListener('click', async () => {
  if (!/^[1-9]\d{5}$/.test(pin.value.trim())) {
    status.textContent = 'Enter a valid six-digit Indian PIN code (for example, 517501).';
    pin.focus();
    return;
  }
  const id = ++requestId,
    button = document.querySelector('#pin-lookup'),
    code = pin.value.trim();
  button.disabled = true;
  status.textContent = 'Finding matching post offices...';
  try {
    const response = await fetch('/api/locations?pin=' + encodeURIComponent(code), {
      signal: AbortSignal.timeout(14000),
    });
    const result = await response.json();
    if (id !== requestId) return;
    if (!response.ok) throw Error(result.error || 'PIN lookup failed.');
    if (!Array.isArray(result.locations) || !result.locations.length) {
      status.textContent =
        'No locations with coordinates found for this PIN. Check the code or choose a listed city.';
      return;
    }
    const matches = result.locations.filter(validCoordinates);
    if (!matches.length)
      throw Error('Location coordinates unavailable. Please choose a listed city.');
    choices = [];
    select.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select your locality / post office';
    placeholder.disabled = true;
    select.append(placeholder);
    addGroup('PIN ' + code + ' - matching post offices', matches);
    addGroup('Or choose an Indian city', cities);
    select.value = '';
    status.textContent = `${matches.length} matching locations. Select yours below.${result.unavailable ? ' Some post offices are omitted because coordinates are unavailable.' : ''} Postal coordinates and modeled air data are approximate.`;
    select.focus();
  } catch (error) {
    if (id === requestId)
      status.textContent =
        error.name === 'TimeoutError'
          ? 'PIN lookup timed out. Please retry or choose a listed city.'
          : error.message;
  } finally {
    if (id === requestId) button.disabled = false;
  }
});
