import { useMemo, useState } from 'react';
import type { AppState, Enquiry, Lane, Quote } from '../types';
import { Badge, Btn, EmptyState } from '../components/ui';
import { Icon } from '../components/Icon';
import { simulateEnquiry } from '../lib/simulate';
import { findLane, pastRatesFor, computeQuote, formatINR, URGENCY_LABELS } from '../lib/quoteEngine';
import { uid } from '../lib/store';
import { QuoteComposer } from './QuoteComposer';

function timeAgo(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function Inbox({
  state,
  onChange,
}: {
  state: AppState;
  onChange: (s: AppState) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    state.enquiries.find((e) => e.status === 'new')?.id ?? state.enquiries[0]?.id ?? null,
  );
  const [composing, setComposing] = useState<Enquiry | null>(null);

  const selected = state.enquiries.find((e) => e.id === selectedId) ?? null;

  const inject = () => {
    const enq = simulateEnquiry();
    onChange({ ...state, enquiries: [enq, ...state.enquiries] });
    setSelectedId(enq.id);
  };

  const laneFor = useMemo(
    () => (enq: Enquiry | null): Lane | undefined =>
      enq ? findLane(state.lanes, enq.parsed.origin, enq.parsed.destination) : undefined,
    [state.lanes],
  );

  const sendQuote = (enq: Enquiry, lane: Lane, rate: number, marginPct: number) => {
    const breakdown = computeQuote({
      lane,
      dieselPrice: state.broker.dieselPricePerLitre,
      marginPct,
      urgency: enq.parsed.urgency,
      pastRates: pastRatesFor(state.quotes, lane.id),
    });
    breakdown.finalRate = rate;
    breakdown.marginRs = Math.round(rate - breakdown.operatingCost);

    const quote: Quote = {
      id: uid('q'),
      enquiryId: enq.id,
      laneId: lane.id,
      laneLabel: `${lane.origin} → ${lane.destination}`,
      customerName: enq.senderName,
      createdAt: new Date().toISOString(),
      rate,
      breakdown,
      status: 'sent',
    };

    const now = new Date().toISOString();
    const quoteText =
      `Namaste ${enq.senderName} ji, ${lane.origin} se ${lane.destination} ` +
      `ke liye hamara rate ${formatINR(rate)} rahega ` +
      `(${lane.vehicleType}, ${enq.parsed.weightT ?? lane.capacityT}T). ` +
      `Gaadi turant available hai. Confirm karein? — ${state.broker.company}`;

    const updated: Enquiry = {
      ...enq,
      status: 'quoted',
      thread: [
        ...enq.thread,
        { id: uid('m'), from: 'broker', text: quoteText, at: now, kind: 'quote' },
      ],
    };

    onChange({
      ...state,
      enquiries: state.enquiries.map((e) => (e.id === enq.id ? updated : e)),
      quotes: [quote, ...state.quotes],
    });
    setComposing(null);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Inbox</h2>
          <p className="muted">WhatsApp enquiries, newest first. Simulated for the demo.</p>
        </div>
        <Btn onClick={inject} icon="plus">
          Simulate incoming enquiry
        </Btn>
      </div>

      <div className="inbox-layout">
        <div className="thread-list card">
          {state.enquiries.length === 0 && (
            <EmptyState
              icon="chat"
              title="No enquiries yet"
              text="Simulate an incoming WhatsApp enquiry to see the quoting flow."
            />
          )}
          {state.enquiries.map((e) => (
            <button
              key={e.id}
              className={`thread-item${e.id === selectedId ? ' active' : ''}`}
              onClick={() => setSelectedId(e.id)}
            >
              <span className="thread-avatar">{e.senderName.charAt(0)}</span>
              <span className="thread-meta">
                <span className="thread-top">
                  <strong>{e.senderName}</strong>
                  <em>{timeAgo(e.receivedAt)}</em>
                </span>
                <span className="thread-sub">
                  {e.parsed.origin} → {e.parsed.destination}
                  {e.parsed.weightT ? ` · ${e.parsed.weightT}T` : ''}
                </span>
                <span className="thread-badges">
                  <Badge tone={e.status === 'new' ? 'warm' : e.status === 'quoted' ? 'sage' : 'mist'}>
                    {e.status === 'new' ? 'needs quote' : e.status}
                  </Badge>
                  <Badge tone="mist">{URGENCY_LABELS[e.parsed.urgency]}</Badge>
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="conversation card">
          {!selected ? (
            <EmptyState icon="chat" title="Pick a conversation" text="Select an enquiry on the left to read the thread." />
          ) : (
            <>
              <div className="conv-head">
                <div>
                  <h3>{selected.senderName}</h3>
                  <p className="muted">{selected.senderPhone}</p>
                </div>
                {selected.status === 'new' && (
                  <Btn icon="spark" onClick={() => setComposing(selected)}>
                    Draft quote
                  </Btn>
                )}
              </div>
              <div className="chat">
                {selected.thread.map((m) => (
                  <div key={m.id} className={`bubble ${m.from}${m.kind === 'quote' ? ' is-quote' : ''}`}>
                    {m.kind === 'quote' && (
                      <span className="bubble-tag">
                        <Icon name="quote" size={12} /> Quote sent
                      </span>
                    )}
                    <p>{m.text}</p>
                    <span className="bubble-time">
                      {new Date(m.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
              <div className="conv-foot muted">
                <Icon name="alert" size={14} />
                <span>
                  Demo mode — messages are simulated. Connect WhatsApp Cloud API in Phase 2 for live threads.
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {composing && laneFor(composing) && (
        <QuoteComposer
          enquiry={composing}
          lane={laneFor(composing)!}
          state={state}
          onClose={() => setComposing(null)}
          onSend={(rate, marginPct) => sendQuote(composing, laneFor(composing)!, rate, marginPct)}
        />
      )}
      {composing && !laneFor(composing) && (
        <div className="modal-backdrop" onClick={() => setComposing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>No matching lane</h3>
              <button className="icon-btn" onClick={() => setComposing(null)} aria-label="Close">
                <Icon name="x" size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="muted">
                This enquiry is for {composing.parsed.origin} → {composing.parsed.destination},
                which isn't in your lane book yet. Add the lane first, then draft the quote.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
