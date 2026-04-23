import { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { DEFAULT_STATE, loadState, saveState } from '../lib/storage';
import * as A from './actions';

const DataContext = createContext(null);

const API_ACTIONS = new Set([
  A.ADD_PLAN, A.UPDATE_PLAN, A.DELETE_PLAN,
  A.ADD_PHASE,
  A.ADD_ITEM, A.UPDATE_ITEM, A.DELETE_ITEM,
  A.SCHEDULE_EXPOSURE, A.UPDATE_SCHEDULE, A.DELETE_SCHEDULE,
  A.ADD_LOG, A.UPDATE_LOG,
  A.ADD_JOURNAL,
]);

function reducer(state, action) {
  switch (action.type) {
    case A.LOAD_STATE:
      return { ...action.payload };

    case A.ADD_PLAN:
      return { ...state, plans: { ...state.plans, [action.payload.id]: action.payload } };
    case A.UPDATE_PLAN:
      return { ...state, plans: { ...state.plans, [action.payload.id]: { ...state.plans[action.payload.id], ...action.payload } } };
    case A.DELETE_PLAN: {
      const { [action.payload]: _, ...plans } = state.plans;
      return { ...state, plans };
    }

    case A.ADD_PHASE:
      return { ...state, phases: { ...state.phases, [action.payload.id]: action.payload } };
    case A.UPDATE_PHASE:
      return { ...state, phases: { ...state.phases, [action.payload.id]: { ...state.phases[action.payload.id], ...action.payload } } };
    case A.DELETE_PHASE: {
      const { [action.payload]: _, ...phases } = state.phases;
      return { ...state, phases };
    }

    case A.ADD_ITEM:
      return { ...state, items: { ...state.items, [action.payload.id]: action.payload } };
    case A.UPDATE_ITEM:
      return { ...state, items: { ...state.items, [action.payload.id]: { ...state.items[action.payload.id], ...action.payload } } };
    case A.DELETE_ITEM: {
      const { [action.payload]: _, ...items } = state.items;
      return { ...state, items };
    }

    case A.SCHEDULE_EXPOSURE:
      return { ...state, scheduled: { ...state.scheduled, [action.payload.id]: action.payload } };
    case A.UPDATE_SCHEDULE:
      return { ...state, scheduled: { ...state.scheduled, [action.payload.id]: { ...state.scheduled[action.payload.id], ...action.payload } } };
    case A.DELETE_SCHEDULE: {
      const { [action.payload]: _, ...scheduled } = state.scheduled;
      return { ...state, scheduled };
    }

    case A.ADD_LOG:
      return { ...state, logs: { ...state.logs, [action.payload.id]: action.payload } };
    case A.UPDATE_LOG:
      return { ...state, logs: { ...state.logs, [action.payload.id]: { ...state.logs[action.payload.id], ...action.payload } } };

    case A.ADD_JOURNAL:
      return { ...state, journals: { ...state.journals, [action.payload.id]: action.payload } };
    case A.UPDATE_JOURNAL:
      return { ...state, journals: { ...state.journals, [action.payload.id]: { ...state.journals[action.payload.id], ...action.payload } } };

    case A.IMPORT_PLAN: {
      const { plan, phases, items, scheduled } = action.payload;
      return {
        ...state,
        plans: { ...state.plans, [plan.id]: plan },
        phases: { ...state.phases, ...phases },
        items: { ...state.items, ...items },
        scheduled: { ...state.scheduled, ...(scheduled || {}) },
      };
    }

    default:
      return state;
  }
}

function buildPayload(action) {
  const { type, payload } = action;
  if (type === A.DELETE_PLAN || type === A.DELETE_ITEM || type === A.DELETE_SCHEDULE) {
    return { action: type, payload: { id: payload } };
  }
  return { action: type, payload };
}

export function DataProvider({ children }) {
  const { data: session, status } = useSession();
  const useApi = status === 'authenticated';
  const loading = status === 'loading';

  const [state, localDispatch] = useReducer(reducer, DEFAULT_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from API or localStorage
  useEffect(() => {
    if (loading) return;

    if (useApi) {
      fetch('/api/workspace/data')
        .then(r => r.ok ? r.json() : DEFAULT_STATE)
        .then(data => {
          localDispatch({ type: A.LOAD_STATE, payload: { ...DEFAULT_STATE, ...data } });
          setIsHydrated(true);
        })
        .catch(() => {
          localDispatch({ type: A.LOAD_STATE, payload: DEFAULT_STATE });
          setIsHydrated(true);
        });
    } else {
      const saved = loadState();
      localDispatch({ type: A.LOAD_STATE, payload: saved });
      setIsHydrated(true);
    }
  }, [useApi, loading]);

  // Persist to localStorage when not using API
  useEffect(() => {
    if (isHydrated && !useApi) {
      saveState(state);
    }
  }, [state, isHydrated, useApi]);

  // Dispatch wrapper: updates local state immediately, syncs to API in background
  const dispatch = useCallback((action) => {
    localDispatch(action);

    if (useApi && API_ACTIONS.has(action.type)) {
      fetch('/api/workspace/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(action)),
      }).catch(err => console.error('Sync error:', err));
    }

    // IMPORT_PLAN needs multiple mutations
    if (useApi && action.type === A.IMPORT_PLAN) {
      const { plan, phases, items, scheduled } = action.payload;
      const mutations = [
        { action: A.ADD_PLAN, payload: plan },
        ...Object.values(phases || {}).map(p => ({ action: A.ADD_PHASE, payload: p })),
        ...Object.values(items || {}).map(i => ({ action: A.ADD_ITEM, payload: i })),
        ...Object.values(scheduled || {}).map(s => ({ action: A.SCHEDULE_EXPOSURE, payload: s })),
      ];
      for (const m of mutations) {
        fetch('/api/workspace/mutate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(m),
        }).catch(err => console.error('Import sync error:', err));
      }
    }
  }, [useApi]);

  return (
    <DataContext.Provider value={{ state, dispatch, isHydrated }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
