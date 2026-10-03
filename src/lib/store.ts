// localStorage fallback store — the demo safety net.
//
// When the API is unreachable, the whole app runs against this store so the
// demo never breaks. Shapes match src/types.ts exactly.

import type { DbData } from '../types';
import { seedDb } from '../data/seed';

const KEY = 'quotemitra-db-v2';

export function loadLocal(): DbData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DbData;
      if (
        parsed &&
        parsed.settings &&
        Array.isArray(parsed.lanes) &&
        Array.isArray(parsed.enquiries) &&
        Array.isArray(parsed.quotes)
      ) {
        return parsed;
      }
    }
  } catch {
    // fall through to seed
  }
  const seeded = seedDb();
  saveLocal(seeded);
  return seeded;
}

export function saveLocal(db: DbData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // storage full / private mode — the app keeps working in-memory
  }
}

export function resetLocal(): DbData {
  const seeded = seedDb();
  saveLocal(seeded);
  return seeded;
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
