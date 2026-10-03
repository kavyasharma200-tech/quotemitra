// localStorage persistence. Single JSON blob; seed on first run.

import type { AppState } from '../types';
import { seedState } from '../data/seed';

const KEY = 'quotemitra-state-v1';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed && parsed.broker && Array.isArray(parsed.lanes)) return parsed;
    }
  } catch {
    // fall through to seed
  }
  const seeded = seedState();
  saveState(seeded);
  return seeded;
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage full / private mode — app still works in-memory for the session
  }
}

export function resetState(): AppState {
  const seeded = seedState();
  saveState(seeded);
  return seeded;
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
