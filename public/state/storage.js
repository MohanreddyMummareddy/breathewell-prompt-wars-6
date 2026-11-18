import { cleanPreferences } from '../domain/profile.js';

const PROFILE_KEY = 'breathewell-profile';
const ACTION_KEY = 'breathewell-actions';
export function indiaDay(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function createStorage(storage, now = () => new Date()) {
  return {
    load() {
      let profile = cleanPreferences(),
        completed = [];
      try {
        profile = cleanPreferences(JSON.parse(storage.getItem(PROFILE_KEY)) || {});
      } catch {
        /* Keep safe defaults when storage is unavailable or corrupt. */
      }
      try {
        const saved = JSON.parse(storage.getItem(ACTION_KEY));
        if (saved?.date === indiaDay(now()) && Array.isArray(saved.ids)) {
          completed = [
            ...new Set(saved.ids.filter((id) => ['move', 'room', 'share', 'commute'].includes(id))),
          ];
        }
      } catch {
        /* Completion is optional; malformed local data is never trusted. */
      }
      return { profile, completed };
    },
    save(profile, completed) {
      try {
        storage.setItem(PROFILE_KEY, JSON.stringify(cleanPreferences(profile)));
        storage.setItem(ACTION_KEY, JSON.stringify({ date: indiaDay(now()), ids: completed }));
        return true;
      } catch {
        return false;
      }
    },
  };
}
