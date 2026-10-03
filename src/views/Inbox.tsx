// Inbox — WhatsApp enquiries. Left: the enquiry list. Right: a timeline
// thread (enquiry → broker replies → quote cards), like a real chat log.

import { useMemo, useState } from 'react';
import type { DbData, LocalEnquiry, ThreadMessage } from '../types';
import { useDb } from '../lib/db';
import {
  Btn,
  EmptyState,
  EnquiryPill,
  Money,
  UrgencyTag,
} from '../components/ui';
import { Icon } from '../components/Icon';
import { simulateEnquiry } from '../lib/simulate';
import { formatWa } from '../lib/quoteEngine';
import { clockTime, relTime } from '../lib/format';
import { QuoteComposer } from './QuoteComposer';

function laneLabel(db: DbData, laneId: string | null): string {
  if (!laneId) return 'Lane not matched';
  const l = db.lanes.find((x) => x.id === laneId);
  return l ? `${l.origin} → ${l.destination}` : 'Lane not matched';
}

/** Merge the stored thread (demo) with quotes sent against this enquiry. */
function buildTimeline(db: DbData, e: LocalEnquiry): ThreadMessage[] {
  const items: ThreadMessage[] = [
    ...(e.thread ?? []),
    // If there's no stored thread (live API mode), the enquiry itself is the first item.
    ...((e.thread ?? []).length === 0
      ? [{ id: `${e.id}-root`, from: 'customer', text: e.text, at: e.createdAt, kind: 'text' } as ThreadMessage]
      : []),
  ];
  const seen = new Set(items.map((m) => m.id));
  // Demo threads already contain the sent quote message; only derive quote
  // items when the thread has none (live API mode).
  const hasStoredQuote = items.some((m) => m.kind === 'quote' && m.from === 'broker');
  if (!hasStoredQuote) {
    for (const q of db.quotes.filter((x) => x.enquiryId === e.id)) {
      const key = `${q.id}-quote-msg`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        id: key,
        from: 'broker',
        text: `Quote ${q.status === 'draft' ? 'drafted' : 'sent'} — ${laneLabel(db, q.laneId)}`,
        at: q.sentAt ?? q.createdAt,
        kind: 'quote',
        rateRs: q.rateRs,
      });
    }
  }
  return items.sort((a, b) => a.at.localeCompare(b.at));
}

export function Inbox({ db }: { db: DbData }) {
  const { injectEnquiry, online } = useDb();
  const [selectedId, setSelectedId] = useState<string | null>(
    db.enquiries.find((e) => e.status === 'new')?.id ?? db.enquiries[0]?.id ?? null,
  );
  const [composing, setComposing] = useState<LocalEnquiry | null>(null);

  const selected = db.enquiries.find((e) => e.id === selectedId) ?? null;
  const timeline = useMemo(
    () => (selected ? buildTimeline(db, selected) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, selectedId],
  );

  const inject = () => {
    const enq = simulateEnquiry();
    void injectEnquiry(enq);
    setSelectedId(enq.id);
  };

  const nameOf = (e: LocalEnquiry) => e.senderName ?? formatWa(e.waFrom);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="kicker small">WhatsApp · inbound</p>
          <h2>Inbox</h2>
          <p className="muted fine">Load enquiries, newest first.</p>
        </div>
        <Btn onClick={inject} icon="plus" variant="secondary">
          Simulate incoming enquiry
        </Btn>
      </div>

      <div className="inbox-layout">
        <div className="thread-list" role="listbox" aria-label="Enquiries">
          {db.enquiries.length === 0 && (
            <EmptyState
              icon="chat"
              title="No enquiries yet"
              text="Simulate an incoming WhatsApp enquiry to see the quoting flow."
            />
          )}
          {db.enquiries.map((e) => (
            <button
              key={e.id}
              role="option"
              aria-selected={e.id === selectedId}
              className={`thread-item${e.id === selectedId ? ' active' : ''}`}
              onClick={() => setSelectedId(e.id)}
            >
              <span className="thread-avatar">{nameOf(e).charAt(0)}</span>
              <span className="thread-meta">
                <span className="thread-top">
                  <strong>{nameOf(e)}</strong>
                  <em>{relTime(e.createdAt)}</em>
                </span>
                <span className="thread-sub">
                  {laneLabel(db, e.laneId)}
                  {e.weightTons ? ` · ${e.weightTons}T` : ''}
                </span>
                <span className="thread-badges">
                  <EnquiryPill status={e.status} />
                  {e.urgency && <UrgencyTag urgency={e.urgency} />}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="conversation">
          {!selected ? (
            <EmptyState
              icon="chat"
              title="Pick a conversation"
              text="Select an enquiry on the left to read the thread."
            />
          ) : (
            <>
              <div className="conv-head">
                <div>
                  <h3>{nameOf(selected)}</h3>
                  <p className="muted fine">
                    {formatWa(selected.waFrom)}
                    {selected.goods ? ` · ${selected.goods}` : ''}
                    {selected.neededBy ? ` · needs: ${selected.neededBy}` : ''}
                  </p>
                </div>
                <div className="conv-head-side">
                  <EnquiryPill status={selected.status} />
                  {selected.status === 'new' && (
                    <Btn icon="spark" onClick={() => setComposing(selected)}>
                      Draft quote
                    </Btn>
                  )}
                </div>
              </div>

              <ol className="timeline">
                {timeline.map((m) => (
                  <li key={m.id} className={`tl-item ${m.from}${m.kind === 'quote' ? ' is-quote' : ''}`}>
                    <span className="tl-dot" aria-hidden="true" />
                    <div className="tl-body">
                      {m.kind === 'quote' ? (
                        <div className="tl-quote">
                          <span className="tl-quote-tag">
                            <Icon name="quote" size={12} />
                            Quote {m.from === 'broker' ? 'sent' : ''}
                          </span>
                          <p>{m.text}</p>
                          {m.rateRs !== undefined && (
                            <Money value={m.rateRs} className="tl-quote-rate" />
                          )}
                        </div>
                      ) : (
                        <p className="tl-text">{m.text}</p>
                      )}
                      <span className="tl-time">{clockTime(m.at)}</span>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="conv-foot muted fine">
                <Icon name={online === false ? 'alert' : 'check'} size={14} />
                <span>
                  {online === false
                    ? 'Demo mode — this thread is simulated locally.'
                    : 'Live thread — replies go out on WhatsApp.'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {composing && (
        <QuoteComposer
          db={db}
          enquiry={composing}
          onClose={() => setComposing(null)}
          onSent={(enquiryId) => {
            setComposing(null);
            setSelectedId(enquiryId);
          }}
        />
      )}
    </div>
  );
}
