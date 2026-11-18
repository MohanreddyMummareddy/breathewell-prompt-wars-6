import { cities, validCoordinates } from '../locations.js';

export const DEFAULT_PREFERENCES = Object.freeze({
  city: 'New Delhi',
  place: cities.find((place) => place.name === 'New Delhi'),
  commute: 10,
  budget: 'low',
  sensitive: true,
  travelMode: 'unknown',
  cooking: 'gas',
  purifier: false,
});

export function cleanPreferences(input = {}) {
  const defaults = DEFAULT_PREFERENCES;
  const city =
    typeof input.city === 'string' && input.city.trim().length <= 200 && input.city.trim()
      ? input.city.trim()
      : defaults.city;
  const place =
    validCoordinates(input.place) &&
    typeof input.place.name === 'string' &&
    typeof input.place.state === 'string'
      ? {
          name: input.place.name.slice(0, 100),
          state: input.place.state.slice(0, 100),
          latitude: input.place.latitude,
          longitude: input.place.longitude,
          ...(String(input.place.pin || '').match(/^[1-9]\d{5}$/) ? { pin: input.place.pin } : {}),
        }
      : cities.find((p) => p.name === city || `${p.name}, ${p.state}` === city);
  return {
    city,
    place,
    commute:
      Number.isFinite(input.commute) && input.commute >= 0 && input.commute <= 200
        ? input.commute
        : defaults.commute,
    budget: ['low', 'flexible'].includes(input.budget) ? input.budget : defaults.budget,
    sensitive: typeof input.sensitive === 'boolean' ? input.sensitive : defaults.sensitive,
    travelMode: ['unknown', 'car', 'two-wheeler', 'public', 'active', 'remote'].includes(
      input.travelMode,
    )
      ? input.travelMode
      : defaults.travelMode,
    cooking: ['gas', 'electric', 'mixed'].includes(input.cooking)
      ? input.cooking
      : defaults.cooking,
    purifier: typeof input.purifier === 'boolean' ? input.purifier : defaults.purifier,
  };
}

// Explicit allowlist: postal coordinates and unrelated browser state never reach the model.
export function assistantContext(profile) {
  const { city, commute, budget, sensitive, travelMode, cooking, purifier } =
    cleanPreferences(profile);
  return {
    city,
    commute,
    budget,
    sensitive,
    travelMode,
    cooking,
    purifier,
    aqi:
      Number.isFinite(profile.aqi) && profile.aqi >= 0 && profile.aqi <= 500 ? profile.aqi : null,
    airDataKind:
      profile.airDataKind === 'Modeled Indian AQI estimate' ? profile.airDataKind : 'Not checked',
    lowerBound: profile.lowerBound === true,
  };
}
