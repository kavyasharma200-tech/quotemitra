import { useState } from 'react';
import type { AppState, Quote, QuoteStatus } from '../types';
import { Badge, EmptyState } from '../components/ui';
import { Icon } from '../components/Icon';
import { formatINR } from '../lib/quoteEngine';

const FILTERS: ('all' | QuoteStatus)[] = ['all', 'sent', 'won', 'lost'];

export function Quotes({
  state,
  onChange,
}: {
  state: AppState;
  onChange: (s: AppState) => void;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');

  const list = [...state.quotes]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((q) => filter === 'all' || q.status === filter);

  const setStatus = (q: Quote, status: QuoteStatus) => {
    onChange({
      ...state,
      quotes: state.quotes.map((x) => (x.id === q.id ? { ...x, status } : x)),
    });
  };

  const tone = (s: QuoteStatus) => (s === 'won' ? 'sage' : s === 'lost' ? 'rose' : 'mist');

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Quote log</h2>
          <p className="muted">Every quote, its margin, and what happened to it.</p>
        </div>
        <div className="seg">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={filter === f ? 'active' : ''}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1)}
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
        <div className="card table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Lane</th>
                <th className="num">Rate</th>
                <th className="num">Your margin</th>
                <th>Status</th>
                <th className="num">Mark</th>
              </tr>
            </thead>
            <tbody>
              {list.map((q) => (
                <tr key={q.id}>
                  <td className="muted">
                    {new Date(q.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </td>
                  <td>{q.customerName}</td>
                  <td>{q.laneLabel}</td>
                  <td className="num strong">{formatINR(q.rate)}</td>
                  <td className="num good">+{formatINR(q.breakdown.marginRs)}</td>
                  <td>
                    <Badge tone={tone(q.status)}>{q.status}</Badge>
                  </td>
                  <td className="num">
                    {q.status === 'sent' ? (
                      <span className="mark-btns">
                        <button
                          className="mini-btn win"
                          onClick={() => setStatus(q, 'won')}
                          title="Mark won"
                        >
                          <Icon name="check" size={14} /> Won
                        </button>
                        <button
                          className="mini-btn lose"
                          onClick={() => setStatus(q, 'lost')}
                          title="Mark lost"
                        >
                          <Icon name="x" size={14} /> Lost
                        </button>
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
