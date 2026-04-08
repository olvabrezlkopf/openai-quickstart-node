import { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { DEFAULT_STATE, loadState, saveState } from '../lib/storage';
import * as A from './actions';

const DataContext = createContext(null);

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
      // Bulk-import AI-generated plan with phases and items in one go
      const { plan, phases, items } = action.payload;
      return {
        ...state,
        plans: { ...state.plans, [plan.id]: plan },
        phases: { ...state.phases, ...phases },
        items: { ...state.items, ...items },
      };
    }

    default:
      return state;
  }
}

export function DataProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = loadState();
    dispatch({ type: A.LOAD_STATE, payload: saved });
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      saveState(state);
    }
  }, [state, isHydrated]);

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
