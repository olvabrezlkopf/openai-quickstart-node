const STORAGE_KEY = 'mutig_data';
const SCHEMA_VERSION = 2;

export const DEFAULT_STATE = {
  _version: SCHEMA_VERSION,
  plans: {},
  phases: {},
  items: {},
  scheduled: {},
  logs: {},
  journals: {},
};

function migrate(parsed) {
  // v1 → v2: add phases map, ensure phases/items have all new fields as undefined
  if (parsed._version === 1) {
    return {
      ...parsed,
      _version: 2,
      phases: parsed.phases || {},
    };
  }
  return parsed;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    const migrated = migrate(parsed);
    if (migrated._version !== SCHEMA_VERSION) {
      return DEFAULT_STATE;
    }
    // Ensure all top-level keys exist
    return {
      ...DEFAULT_STATE,
      ...migrated,
    };
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
