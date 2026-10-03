// DbProvider — the single data source for every view.
//
// Startup: probe the API. If it answers, load everything from the server
// (live mode). If ANY probe/load call fails, silently run on the
// localStorage fallback store (demo mode) so the app never breaks.
//
// Actions are optimistic: update local state first, then attempt the remote
// call; a remote failure flips the app to demo mode and persists locally.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  DbData,
  DraftInput,
  EnquiryStatus,
  Lane,
  LocalEnquiry,
  LocalLane,
  LocalQuote,
  Quote,
  QuoteStatus,
  Settings,
  ThreadMessage,
} from '../types';
import { api } from './api';
import { loadLocal, resetLocal, saveLocal, uid } from './store';
import { draftQuoteLocal, pastRatesFor } from './quoteEngine';

interface DbContextValue {
  db: DbData | null;
  /** null = still probing, true = live API, false = demo fallback */
  online: boolean | null;
  saveSettings: (s: Settings) => Promise<void>;
  addLane: (lane: LocalLane) => Promise<void>;
  updateLane: (lane: LocalLane) => Promise<void>;
  removeLane: (id: string) => Promise<void>;
  injectEnquiry: (e: LocalEnquiry) => Promise<void>;
  setEnquiryStatus: (id: string, status: EnquiryStatus) => Promise<void>;
  appendThreadMessage: (enquiryId: string, msg: ThreadMessage) => void;
  /** Draft via POST /api/quotes/draft; falls back to the local engine. */
  draftQuote: (input: DraftInput) => Promise<LocalQuote>;
  /** Send a drafted quote on WhatsApp: marks quote sent + enquiry quoted. */
  sendQuote: (quote: LocalQuote, messageText: string) => Promise<void>;
  markQuote: (id: string, status: QuoteStatus) => Promise<void>;
  resetDemo: () => void;
  refresh: () => Promise<void>;
}

const DbContext = createContext<DbContextValue | null>(null);

export function useDb(): DbContextValue {
  const ctx = useContext(DbContext);
  if (!ctx) throw new Error('useDb must be used inside DbProvider');
  return ctx;
}

const byCreatedDesc = <T extends { createdAt: string }>(a: T, b: T) =>
  b.createdAt.localeCompare(a.createdAt);

export function DbProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DbData | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);

  const dbRef = useRef<DbData | null>(null);
  const onlineRef = useRef<boolean | null>(null);

  useEffect(() => {
    dbRef.current = db;
    onlineRef.current = online;
  });

  const persistIfDemo = useCallback((next: DbData) => {
    if (onlineRef.current === false) saveLocal(next);
  }, []);

  /** Any remote failure → demo mode: keep working locally, show the badge. */
  const goDemo = useCallback(() => {
    setOnline(false);
    const cur = dbRef.current;
    if (cur) saveLocal(cur);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [settings, lanes, quotes, enquiries] = await Promise.all([
        api.settings.get(),
        api.lanes.list(),
        api.quotes.list(),
        api.enquiries.list(),
      ]);
      setDb({
        settings,
        lanes: [...lanes].sort(byCreatedDesc) as LocalLane[],
        quotes: [...quotes].sort(byCreatedDesc) as LocalQuote[],
        enquiries: [...enquiries].sort(byCreatedDesc) as LocalEnquiry[],
      });
      setOnline(true);
    } catch {
      setDb(loadLocal());
      goDemo();
    }
  }, [goDemo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mutate = useCallback(
    async (
      local: (prev: DbData) => DbData,
      remote: () => Promise<unknown>,
    ): Promise<void> => {
      setDb((prev) => {
        if (!prev) return prev;
        const next = local(prev);
        persistIfDemo(next);
        return next;
      });
      if (onlineRef.current === false) return;
      try {
        await remote();
      } catch {
        goDemo();
      }
    },
    [goDemo, persistIfDemo],
  );

  const saveSettings = useCallback(
    (s: Settings) =>
      mutate((prev) => ({ ...prev, settings: s }), () => api.settings.update(s)),
    [mutate],
  );

  const addLane = useCallback(
    (lane: LocalLane) =>
      mutate(
        (prev) => ({ ...prev, lanes: [lane, ...prev.lanes] }),
        async () => {
          const created = await api.lanes.create(lane);
          setDb((prev) =>
            prev
              ? {
                  ...prev,
                  lanes: [
                    created as LocalLane,
                    ...prev.lanes.filter((l) => l.id !== lane.id),
                  ],
                }
              : prev,
          );
        },
      ),
    [mutate],
  );

  const updateLane = useCallback(
    (lane: LocalLane) =>
      mutate(
        (prev) => ({
          ...prev,
          lanes: prev.lanes.map((l) => (l.id === lane.id ? lane : l)),
        }),
        () => api.lanes.update(lane.id, lane),
      ),
    [mutate],
  );

  const removeLane = useCallback(
    (id: string) =>
      mutate(
        (prev) => ({ ...prev, lanes: prev.lanes.filter((l) => l.id !== id) }),
        () => api.lanes.remove(id),
      ),
    [mutate],
  );

  const injectEnquiry = useCallback(
    (e: LocalEnquiry) =>
      mutate(
        (prev) => ({ ...prev, enquiries: [e, ...prev.enquiries] }),
        async () => {
          const created = await api.enquiries.create(e);
          // Server rows don't carry demo display fields; merge them back.
          const merged: LocalEnquiry = {
            ...created,
            senderName: e.senderName,
            goods: e.goods,
            neededBy: e.neededBy,
            urgency: e.urgency,
            thread: e.thread,
          };
          setDb((prev) =>
            prev
              ? {
                  ...prev,
                  enquiries: [
                    merged,
                    ...prev.enquiries.filter((x) => x.id !== e.id),
                  ],
                }
              : prev,
          );
        },
      ),
    [mutate],
  );

  const setEnquiryStatus = useCallback(
    (id: string, status: EnquiryStatus) =>
      mutate(
        (prev) => ({
          ...prev,
          enquiries: prev.enquiries.map((en) =>
            en.id === id ? { ...en, status } : en,
          ),
        }),
        () => api.enquiries.update(id, { status }),
      ),
    [mutate],
  );

  /** Append a chat message to an enquiry's thread (demo thread richness). */
  const appendThreadMessage = useCallback(
    (enquiryId: string, msg: ThreadMessage) => {
      setDb((prev) => {
        if (!prev) return prev;
        const next: DbData = {
          ...prev,
          enquiries: prev.enquiries.map((en) =>
            en.id === enquiryId
              ? { ...en, thread: [...(en.thread ?? []), msg] }
              : en,
          ),
        };
        persistIfDemo(next);
        return next;
      });
    },
    [persistIfDemo],
  );

  const draftQuote = useCallback(
    async (input: DraftInput): Promise<LocalQuote> => {
      if (onlineRef.current !== false) {
        try {
          const q = await api.quotes.draft({
            laneId: input.laneId,
            weightTons: input.weightTons,
            urgency: input.urgency,
            marginPct: input.marginPct,
            enquiryId: input.enquiryId ?? null,
          });
          return q as LocalQuote;
        } catch {
          setOnline(false);
        }
      }
      // Local fallback: identical maths (see quoteEngine.ts).
      const cur = dbRef.current;
      const lane: Lane | undefined = cur?.lanes.find(
        (l) => l.id === input.laneId,
      );
      if (!lane) throw new Error('Lane not found for draft');
      return draftQuoteLocal({
        lane,
        dieselPrice: cur?.settings.dieselPrice ?? 92,
        marginPct: input.marginPct,
        urgency: input.urgency,
        pastRates: pastRatesFor(cur?.quotes ?? [], input.laneId),
        weightTons: input.weightTons,
        enquiryId: input.enquiryId ?? null,
      });
    },
    [],
  );

  const sendQuote = useCallback(
    async (quote: LocalQuote, messageText: string): Promise<void> => {
      const sentAt = new Date().toISOString();
      const final: LocalQuote = { ...quote, status: 'sent', sentAt };

      if (onlineRef.current !== false) {
        try {
          // The draft endpoint returns a persisted draft; flip it to sent.
          // If the server didn't persist the draft, create the quote instead.
          let serverQuote: Quote;
          try {
            serverQuote = await api.quotes.update(quote.id, {
              status: 'sent',
              sentAt,
              rateRs: quote.rateRs,
              marginRs: quote.marginRs,
              breakdown: quote.breakdown,
            });
          } catch {
            serverQuote = await api.quotes.create(final);
          }
          const enqId = quote.enquiryId;
          if (enqId) {
            try {
              await api.enquiries.update(enqId, { status: 'quoted' });
            } catch {
              /* enquiry update is best-effort */
            }
          }
          setDb((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              quotes: [
                {
                  ...(serverQuote as LocalQuote),
                  customerName: quote.customerName,
                },
                ...prev.quotes.filter(
                  (q) => q.id !== quote.id && q.id !== serverQuote.id,
                ),
              ],
              enquiries: enqId
                ? prev.enquiries.map((en) =>
                    en.id === enqId
                      ? { ...en, status: 'quoted' as EnquiryStatus }
                      : en,
                  )
                : prev.enquiries,
            };
          });
          return;
        } catch {
          setOnline(false);
        }
      }

      // Demo fallback: everything stays local, thread gets the message.
      setDb((prev) => {
        if (!prev) return prev;
        const next: DbData = {
          ...prev,
          quotes: [final, ...prev.quotes.filter((q) => q.id !== final.id)],
          enquiries: final.enquiryId
            ? prev.enquiries.map((en) =>
                en.id === final.enquiryId
                  ? {
                      ...en,
                      status: 'quoted' as EnquiryStatus,
                      thread: [
                        ...(en.thread ?? []),
                        {
                          id: uid('m'),
                          from: 'broker',
                          text: messageText,
                          at: sentAt,
                          kind: 'quote',
                          rateRs: final.rateRs,
                        } as ThreadMessage,
                      ],
                    }
                  : en,
              )
            : prev.enquiries,
        };
        saveLocal(next);
        return next;
      });
    },
    [],
  );

  const markQuote = useCallback(
    (id: string, status: QuoteStatus) =>
      mutate(
        (prev) => ({
          ...prev,
          quotes: prev.quotes.map((q) => (q.id === id ? { ...q, status } : q)),
        }),
        () => api.quotes.update(id, { status }),
      ),
    [mutate],
  );

  const resetDemo = useCallback(() => {
    setDb(resetLocal());
    setOnline(false);
  }, []);

  const value = useMemo<DbContextValue>(
    () => ({
      db,
      online,
      saveSettings,
      addLane,
      updateLane,
      removeLane,
      injectEnquiry,
      setEnquiryStatus,
      appendThreadMessage,
      draftQuote,
      sendQuote,
      markQuote,
      resetDemo,
      refresh,
    }),
    [
      db,
      online,
      saveSettings,
      addLane,
      updateLane,
      removeLane,
      injectEnquiry,
      setEnquiryStatus,
      appendThreadMessage,
      draftQuote,
      sendQuote,
      markQuote,
      resetDemo,
      refresh,
    ],
  );

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}
