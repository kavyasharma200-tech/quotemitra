// Dashboard — the quoting desk. Dense like a trading terminal: hairline
// grid, big mono numbers, zero decoration.

import type { DbData, View } from '../types';
import { Btn, EmptyState, EnquiryPill, Money, QuotePill, Stat } from '../components/ui';
import { formatWa } from '../lib/quoteEngine';
import { relTime } from '../lib/format';

const TODAY = new Date().toLocaleDateString('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function laneLabel(db: DbData, laneId: string): string {
  const l = db.lanes.find((x) => x.id === laneId);
  return l ? `${l.origin} → ${l.destination}` : 'Unknown lane';
}

function customerName(db: DbData, quote: DbData['quotes'][number]): string {
  if (quote.customerName) return quote.customerName;
  const enq = db.enquiries.find((e) => e.id === quote.enquiryId);
  return enq?.senderName ?? formatWa(enq?.waFrom ?? '—');
}

export function Dashboard({
  db,
  onNav,
}: {
  db: DbData;
  onNav: (v: View) => void;
}) {
  const { quotes, enquiries, lanes, settings } = db;

  const decided = quotes.filter((q) => q.status === 'won' || q.status === 'lost');
  const won = quotes.filter((q) => q.status === 'won');
  const winRate = decided.length ? Math.round((won.length / decided.length) * 100) : 0;
  const marginBanked = won.reduce((s, q) => s + q.marginRs, 0);
  const open = enquiries.filter((e) => e.status === 'new');
  const avgQuote = quotes.length
    ? Math.round(quotes.reduce((s, q) => s + q.rateRs, 0) / quotes.length)
    : 0;

  const recent = [...quotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  const laneBoard = lanes.map((l) => {
    const lq = quotes.filter((q) => q.laneId === l.id);
    const last = lq.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return { lane: l, count: lq.length, lastRate: last?.rateRs };
  });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="kicker small">{settings.company} · quoting desk</p>
          <h2>
            Namaste, <em>{settings.name.split(' ')[0] || 'broker'}</em>
          </h2>
          <p className="muted fine">{TODAY} · diesel <Money value={settings.dieselPrice} className="inline" />/L</p>
        </div>
        <Btn onClick={() => onNav('inbox')} icon="chat">
          Open inbox
          {open.length > 0 && <span className="btn-count">{open.length}</span>}
        </Btn>
      </div>

      <section className="tstats" aria-label="Desk figures">
        <Stat label="Quotes sent" value={String(quotes.length)} sub="all time" />
        <Stat label="Win rate" value={`${winRate}%`} sub={`${won.length} won · ${decided.length - won.length} lost`} accent />
        <Stat label="Margin banked" value={`₹${marginBanked.toLocaleString('en-IN')}`} sub="on won loads" accent />
        <Stat label="Open enquiries" value={String(open.length)} sub="need a reply" />
        <Stat label="Active lanes" value={String(lanes.length)} sub={<>avg quote <Money value={avgQuote} className="inline" /></>} />
      </section>

      <div className="two-col">
        <section>
          <div className="section-head">
            <div>
              <h3>Needs a reply</h3>
              <p className="muted fine">New enquiries, oldest first — speed wins loads.</p>
            </div>
            <button className="link" onClick={() => onNav('inbox')}>Inbox</button>
          </div>
          {open.length === 0 ? (
            <EmptyState
              icon="check"
              title="All caught up"
              text="No open enquiries. New load requests will appear here the moment they arrive."
            />
          ) : (
            <ul className="rows">
              {[...open].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, 4).map((e) => (
                <li key={e.id} className="row">
                  <div className="row-main">
                    <strong>{e.senderName ?? formatWa(e.waFrom)}</strong>
                    <span className="muted">
                      {e.laneId ? laneLabel(db, e.laneId) : 'Lane not matched'}
                      {e.weightTons ? ` · ${e.weightTons}T` : ''}
                    </span>
                    <span className="fine faint">{relTime(e.createdAt)}</span>
                  </div>
                  <Btn variant="secondary" onClick={() => onNav('inbox')}>
                    Draft quote
                  </Btn>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="section-head">
            <div>
              <h3>Latest quotes</h3>
              <p className="muted fine">Most recent first.</p>
            </div>
            <button className="link" onClick={() => onNav('quotes')}>Quote log</button>
          </div>
          {recent.length === 0 ? (
            <EmptyState icon="quote" title="No quotes yet" text="Draft your first quote from the inbox." />
          ) : (
            <ul className="rows">
              {recent.map((q) => (
                <li key={q.id} className="row">
                  <div className="row-main">
                    <strong>{laneLabel(db, q.laneId)}</strong>
                    <span className="muted">{customerName(db, q)}</span>
                  </div>
                  <div className="row-side">
                    <Money value={q.rateRs} className="strong" />
                    <QuotePill status={q.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section>
        <div className="section-head">
          <div>
            <h3>Lane board</h3>
            <p className="muted fine">Typical rate vs your last quote, per lane.</p>
          </div>
          <button className="link" onClick={() => onNav('lanes')}>Lane book</button>
        </div>
        <div className="laneboard">
          <div className="laneboard-head">
            <span>Lane</span>
            <span>Vehicle</span>
            <span className="num">Typical</span>
            <span className="num">Last quote</span>
            <span className="num">Quotes</span>
          </div>
          {laneBoard.map(({ lane, count, lastRate }) => (
            <div key={lane.id} className="laneboard-row">
              <span className="strong">{lane.origin} → {lane.destination}</span>
              <span className="muted">{lane.vehicleType}</span>
              <span className="num"><Money value={lane.typicalRateRs} /></span>
              <span className="num">{lastRate ? <Money value={lastRate} /> : <span className="faint">—</span>}</span>
              <span className="num muted">{count}</span>
            </div>
          ))}
        </div>
      </section>

      {open.length > 0 && (
        <section className="open-strip">
          <EnquiryPill status="new" />
          <p>
            <strong>{open.length} open {open.length === 1 ? 'enquiry' : 'enquiries'}</strong>
            <span className="muted"> — the oldest has waited {relTime([...open].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0].createdAt)}.</span>
          </p>
          <Btn variant="secondary" onClick={() => onNav('inbox')}>Reply now</Btn>
        </section>
      )}
    </div>
  );
}
