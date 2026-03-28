const STORAGE_KEY = 'mutig_data';
const SCHEMA_VERSION = 1;

export const DEFAULT_STATE = {
  _version: SCHEMA_VERSION,
  plans: {},
  items: {},
  scheduled: {},
  logs: {},
  journals: {},
};

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    if (parsed._version !== SCHEMA_VERSION) {
      return DEFAULT_STATE;
    }
    return parsed;
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.warn('Mutig: localStorage quota exceeded');
    }
  }
}
