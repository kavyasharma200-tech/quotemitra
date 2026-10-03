import { useMemo, useState } from 'react';
import type { AppState, Enquiry, Lane, Urgency } from '../types';
import { Btn, Field, Modal } from '../components/ui';
import { Icon } from '../components/Icon';
import {
  computeQuote,
  pastRatesFor,
  formatINR,
  URGENCY_LABELS,
  URGENCY_MULTIPLIERS,
} from '../lib/quoteEngine';

const URGENCIES: Urgency[] = ['standard', 'urgent', 'same-day'];

export function QuoteComposer({
  enquiry,
  lane,
  state,
  onClose,
  onSend,
}: {
  enquiry: Enquiry;
  lane: Lane;
  state: AppState;
  onClose: () => void;
  onSend: (rate: number, marginPct: number) => void;
}) {
  const history = useMemo(
    () => pastRatesFor(state.quotes, lane.id),
    [state.quotes, lane.id],
  );
  const [marginPct, setMarginPct] = useState(state.broker.defaultMarginPct);
  const [urgency, setUrgency] = useState<Urgency>(enquiry.parsed.urgency);

  const base = useMemo(
    () =>
      computeQuote({
        lane,
        dieselPrice: state.broker.dieselPricePerLitre,
        marginPct,
        urgency,
        pastRates: history,
      }),
    [lane, state.broker.dieselPricePerLitre, marginPct, urgency, history],
  );

  const [rate, setRate] = useState(base.finalRate);
  // Keep the editable rate in sync when inputs change, unless the broker typed a custom value.
  const [touched, setTouched] = useState(false);
  const shownRate = touched ? rate : base.finalRate;
  const marginRs = Math.round(shownRate - base.operatingCost);

  const rows: [string, number, string?][] = [
    ['Diesel & running', base.fuel, `${lane.distanceKm} km ÷ ${lane.mileageKmpl} km/l × ₹${state.broker.dieselPricePerLitre}/L`],
    ['Toll (FASTag)', base.toll, 'lane estimate'],
    ['Driver bata', base.driverBata, 'per trip allowance'],
    ['Loading / unloading', base.handling, 'labour both ends'],
  ];

  return (
    <Modal title={`Draft quote — ${lane.origin} → ${lane.destination}`} onClose={onClose} wide>
      <div className="composer">
        <div className="composer-left">
          <div className="enquiry-ref">
            <Icon name="chat" size={16} />
            <p>"{enquiry.rawText}"</p>
            <span className="muted">— {enquiry.senderName}, {enquiry.senderPhone}</span>
          </div>

          <div className="compose-controls">
            <Field label="Your margin">
              <div className="margin-row">
                <input
                  type="range"
                  min={5}
                  max={25}
                  step={1}
                  value={marginPct}
                  onChange={(e) => setMarginPct(Number(e.target.value))}
                />
                <strong>{marginPct}%</strong>
              </div>
            </Field>
            <Field label="Urgency">
              <div className="seg">
                {URGENCIES.map((u) => (
                  <button
                    key={u}
                    type="button"
                    className={urgency === u ? 'active' : ''}
                    onClick={() => setUrgency(u)}
                  >
                    {URGENCY_LABELS[u]}
                    <em>×{URGENCY_MULTIPLIERS[u]}</em>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Final rate to customer (₹) — editable">
              <input
                type="number"
                value={shownRate}
                step={50}
                onChange={(e) => {
                  setTouched(true);
                  setRate(Number(e.target.value) || 0);
                }}
              />
            </Field>
          </div>

          <div className="composer-actions">
            <Btn variant="secondary" onClick={onClose}>
              Discard
            </Btn>
            <Btn icon="send" onClick={() => onSend(shownRate, marginPct)}>
              Send on WhatsApp
            </Btn>
          </div>
          <p className="muted fine">Demo: the message is logged in the thread as sent. Live sending connects in Phase 2.</p>
        </div>

        <div className="composer-right">
          <h4>Cost breakdown</h4>
          <p className="muted fine">
            {history.length > 0
              ? `Blended from ${history.length} past quote${history.length > 1 ? 's' : ''} on this lane (latest ${formatINR(history[0])}) + trip cost.`
              : 'No history on this lane yet — built from trip cost with a 5% safety factor.'}
          </p>
          <dl className="breakdown">
            {rows.map(([label, value, note]) => (
              <div key={label}>
                <dt>
                  {label}
                  {note && <span className="muted"> · {note}</span>}
                </dt>
                <dd>{formatINR(value)}</dd>
              </div>
            ))}
            <div className="bd-subtotal">
              <dt>Trip cost</dt>
              <dd>{formatINR(base.operatingCost)}</dd>
            </div>
            <div>
              <dt>
                Your margin
                <span className="muted"> · {marginPct}%</span>
              </dt>
              <dd className="good">+{formatINR(marginRs)}</dd>
            </div>
            {urgency !== 'standard' && (
              <div>
                <dt>
                  Urgency
                  <span className="muted"> · {URGENCY_LABELS[urgency]} ×{URGENCY_MULTIPLIERS[urgency]}</span>
                </dt>
                <dd>included</dd>
              </div>
            )}
            <div className="bd-total">
              <dt>Quote to customer</dt>
              <dd>{formatINR(shownRate)}</dd>
            </div>
          </dl>
          <p className="muted fine">
            Diesel at ₹{state.broker.dieselPricePerLitre}/L · history auto-adjusts +2.6% per ₹5/L diesel move.
          </p>
        </div>
      </div>
    </Modal>
  );
}
