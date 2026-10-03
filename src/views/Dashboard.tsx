import type { AppState, View } from '../types';
import { StatCard, EmptyState, Badge, Btn } from '../components/ui';
import { formatINR } from '../lib/quoteEngine';

export function Dashboard({
  state,
  onNav,
}: {
  state: AppState;
  onNav: (v: View) => void;
}) {
  const { quotes, enquiries } = state;
  const sent = quotes.filter((q) => q.status !== 'sent').length + quotes.filter((q) => q.status === 'sent').length;
  const decided = quotes.filter((q) => q.status === 'won' || q.status === 'lost');
  const won = quotes.filter((q) => q.status === 'won');
  const winRate = decided.length ? Math.round((won.length / decided.length) * 100) : 0;
  const marginEarned = won.reduce((s, q) => s + q.breakdown.marginRs, 0);
  const pending = enquiries.filter((e) => e.status === 'new');
  const recent = [...quotes]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Namaste, {state.broker.name.split(' ')[0]}</h2>
          <p className="muted">Here's your quoting desk for today.</p>
        </div>
        <Btn onClick={() => onNav('inbox')} icon="chat">
          Open inbox
        </Btn>
      </div>

      <div className="stat-grid">
        <StatCard icon="quote" label="Quotes sent" value={String(sent)} sub="all time" />
        <StatCard icon="check" label="Win rate" value={`${winRate}%`} sub={`${won.length} won of ${decided.length} decided`} />
        <StatCard icon="rupee" label="Margin earned" value={formatINR(marginEarned)} sub="on won loads" tone="ink" />
        <StatCard
          icon="chat"
          label="Waiting for quote"
          value={String(pending.length)}
          sub="enquiries need a reply"
          tone="warm"
        />
      </div>

      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <h3>Needs your reply</h3>
            <button className="link" onClick={() => onNav('inbox')}>
              View inbox
            </button>
          </div>
          {pending.length === 0 ? (
            <EmptyState
              icon="check"
              title="All caught up"
              text="No pending enquiries. New load requests will appear here the moment they arrive."
            />
          ) : (
            <ul className="mini-list">
              {pending.slice(0, 4).map((e) => (
                <li key={e.id}>
                  <div>
                    <strong>{e.senderName}</strong>
                    <span className="muted">
                      {' '}
                      · {e.parsed.origin} → {e.parsed.destination}
                      {e.parsed.weightT ? ` · ${e.parsed.weightT}T` : ''}
                    </span>
                  </div>
                  <Btn variant="secondary" onClick={() => onNav('inbox')}>
                    Quote
                  </Btn>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h3>Latest quotes</h3>
            <button className="link" onClick={() => onNav('quotes')}>
              Quote log
            </button>
          </div>
          {recent.length === 0 ? (
            <EmptyState icon="quote" title="No quotes yet" text="Draft your first quote from the inbox." />
          ) : (
            <ul className="mini-list">
              {recent.map((q) => (
                <li key={q.id}>
                  <div>
                    <strong>{q.laneLabel}</strong>
                    <span className="muted"> · {formatINR(q.rate)}</span>
                  </div>
                  <Badge
                    tone={q.status === 'won' ? 'sage' : q.status === 'lost' ? 'rose' : 'mist'}
                  >
                    {q.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
