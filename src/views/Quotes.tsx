// Quotes — the quote log. Filter by status, mark sent quotes won/lost.
// Dense table on desktop, stacked rows on mobile.

import { useState } from 'react';
import type { DbData, QuoteStatus } from '../types';
import { useDb } from '../lib/db';
import { EmptyState, Money, QuotePill } from '../components/ui';
import { Icon } from '../components/Icon';
import { formatWa } from '../lib/quoteEngine';

const FILTERS: Array<'all' | QuoteStatus> = ['all', 'draft', 'sent', 'won', 'lost'];

function laneLabel(db: DbData, laneId: string): string {
  const l = db.lanes.find((x) => x.id === laneId);
  return l ? `${l.origin} → ${l.destination}` : '—';
}

function customerName(db: DbData, q: DbData['quotes'][number]): string {
  if (q.customerName) return q.customerName;
  const enq = db.enquiries.find((e) => e.id === q.enquiryId);
  return enq?.senderName ?? (enq ? formatWa(enq.waFrom) : 'Direct quote');
}

function dateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function Quotes({ db }: { db: DbData }) {
  const { markQuote } = useDb();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');

  const list = [...db.quotes]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((q) => filter === 'all' || q.status === filter);

  const counts = Object.fromEntries(
    FILTERS.map((f) => [
      f,
      f === 'all' ? db.quotes.length : db.quotes.filter((q) => q.status === f).length,
    ]),
  ) as Record<(typeof FILTERS)[number], number>;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="kicker small">Ledger</p>
          <h2>Quote log</h2>
          <p className="muted fine">Every quote, its margin, and what happened to it.</p>
        </div>
        <div className="seg filters" role="tablist" aria-label="Filter quotes">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              className={filter === f ? 'active' : ''}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1)}
              <em>{counts[f]}</em>
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon="quote"
          title="No quotes here yet"
          text="Quotes you send from the inbox land here automatically."
        />
      ) : (
        <div className="qtable">
          <div className="qtable-head">
            <span>Date</span>
            <span>Customer</span>
            <span>Lane</span>
            <span className="num">Rate</span>
            <span className="num">Margin</span>
            <span>Status</span>
            <span className="num">Mark</span>
          </div>
          {list.map((q) => (
            <div key={q.id} className="qtable-row">
              <span className="muted qdate" data-label="Date">{dateShort(q.createdAt)}</span>
              <span className="strong" data-label="Customer">{customerName(db, q)}</span>
              <span data-label="Lane">{laneLabel(db, q.laneId)}</span>
              <span className="num strong" data-label="Rate"><Money value={q.rateRs} /></span>
              <span className="num" data-label="Margin">
                <Money value={q.marginRs} className="sage-num" prefix="+" />
              </span>
              <span data-label="Status"><QuotePill status={q.status} /></span>
              <span className="num" data-label="Mark">
                {q.status === 'sent' ? (
                  <span className="mark-btns">
                    <button className="mini-btn win" onClick={() => void markQuote(q.id, 'won')}>
                      <Icon name="check" size={13} /> Won
                    </button>
                    <button className="mini-btn lose" onClick={() => void markQuote(q.id, 'lost')}>
                      <Icon name="x" size={13} /> Lost
                    </button>
                  </span>
                ) : (
                  <span className="faint">—</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
