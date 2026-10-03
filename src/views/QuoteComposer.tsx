// QuoteComposer — draft a quote against an enquiry.
//
// Calls POST /api/quotes/draft (via db.draftQuote); when the API is
// unreachable the identical local engine computes the draft. The broker
// tunes margin / urgency / the final rate, sees the stacked-bar cost
// breakdown, then sends — the quote is marked sent and the enquiry quoted.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { DbData, LocalEnquiry, LocalQuote, Urgency } from '../types';
import { useDb } from '../lib/db';
import { Btn, Field, Modal, Money, StackedBar, UrgencyTag } from '../components/ui';
import { Icon } from '../components/Icon';
import {
  URGENCY_LABELS,
  URGENCY_MULTIPLIERS,
  formatINR,
  formatWa,
} from '../lib/quoteEngine';

const URGENCIES: Urgency[] = ['standard', 'urgent', 'same-day'];

export function QuoteComposer({
  db,
  enquiry,
  onClose,
  onSent,
}: {
  db: DbData;
  enquiry: LocalEnquiry;
  onClose: () => void;
  onSent: (enquiryId: string) => void;
}) {
  const { draftQuote, sendQuote } = useDb();

  const [laneId, setLaneId] = useState<string>(enquiry.laneId ?? db.lanes[0]?.id ?? '');
  const lane = db.lanes.find((l) => l.id === laneId);

  const [weightTons, setWeightTons] = useState<number>(enquiry.weightTons ?? 5);
  const [urgency, setUrgency] = useState<Urgency>(enquiry.urgency ?? 'standard');
  const [marginPct, setMarginPct] = useState<number>(db.settings.defaultMarginPct);

  const [draft, setDraft] = useState<LocalQuote | null>(null);
  const [drafting, setDrafting] = useState(true);
  const [draftError, setDraftError] = useState<string | null>(null);

  const [rate, setRate] = useState(0);
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);

  const reqId = useRef(0);

  useEffect(() => {
    if (!lane) {
      setDrafting(false);
      setDraftError('Pick a lane to draft against.');
      return;
    }
    setDrafting(true);
    setDraftError(null);
    const id = ++reqId.current;
    const t = setTimeout(() => {
      draftQuote({
        laneId: lane.id,
        weightTons,
        urgency,
        marginPct,
        enquiryId: enquiry.id,
      })
        .then((q) => {
          if (reqId.current !== id) return;
          setDraft(q);
          setDrafting(false);
        })
        .catch(() => {
          if (reqId.current !== id) return;
          setDraftError('Could not compute a draft. Check the lane and try again.');
          setDrafting(false);
        });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laneId, weightTons, urgency, marginPct]);

  const shownRate = touched ? rate : (draft?.rateRs ?? 0);
  const operatingCost = draft?.breakdown.operatingCost ?? 0;
  const shownMargin = Math.round(shownRate - operatingCost);

  const historyNote = useMemo(() => {
    if (!draft) return '';
    const h = draft.breakdown.historyRate;
    const past = db.quotes.filter((q) => q.laneId === laneId).length;
    if (h && past > 0)
      return `Blended from ${past} past quote${past > 1 ? 's' : ''} on this lane (latest ${formatINR(h)}) + trip cost.`;
    return 'No history on this lane yet — built from trip cost with a 5% safety factor.';
  }, [draft, db.quotes, laneId]);

  const send = async () => {
    if (!draft || !lane || sending) return;
    setSending(true);
    const name = enquiry.senderName ?? formatWa(enquiry.waFrom);
    const messageText =
      `Namaste ${name} ji, ${lane.origin} se ${lane.destination} ke liye hamara rate ${formatINR(shownRate)} rahega ` +
      `(${lane.vehicleType}, ${weightTons}T). Gaadi turant available hai. Confirm karein? — ${db.settings.company}`;
    const final: LocalQuote = {
      ...draft,
      rateRs: shownRate,
      marginRs: shownMargin,
      customerName: enquiry.senderName,
    };
    try {
      await sendQuote(final, messageText);
      onSent(enquiry.id);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      title={lane ? `Draft quote — ${lane.origin} → ${lane.destination}` : 'Draft quote'}
      sub={lane ? `${lane.vehicleType} · ${lane.distanceKm} km · toll ≈ ${formatINR(lane.tollRs)}` : undefined}
      onClose={onClose}
      wide
    >
      <div className="composer">
        <div className="composer-left">
          <div className="enquiry-ref">
            <span className="enquiry-ref-tag">
              <Icon name="chat" size={13} />
              Enquiry · {enquiry.senderName ?? formatWa(enquiry.waFrom)}
            </span>
            <p>“{enquiry.text}”</p>
          </div>

          <div className="compose-controls">
            <Field label="Lane">
              <select value={laneId} onChange={(e) => setLaneId(e.target.value)}>
                {db.lanes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.origin} → {l.destination} · {l.vehicleType}
                  </option>
                ))}
              </select>
            </Field>

            <div className="form-grid">
              <Field label="Weight (tonnes)">
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={weightTons}
                  onChange={(e) => setWeightTons(Number(e.target.value) || 0)}
                />
              </Field>
              <Field label="Your margin" hint={`${marginPct}% of trip cost`}>
                <div className="margin-row">
                  <input
                    type="range"
                    min={5}
                    max={25}
                    step={1}
                    value={marginPct}
                    onChange={(e) => setMarginPct(Number(e.target.value))}
                    aria-label="Margin percent"
                  />
                  <strong className="inr">{marginPct}%</strong>
                </div>
              </Field>
            </div>

            <Field label="Urgency">
              <div className="seg" role="radiogroup" aria-label="Urgency">
                {URGENCIES.map((u) => (
                  <button
                    key={u}
                    type="button"
                    role="radio"
                    aria-checked={urgency === u}
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
                className="inr rate-input"
                type="number"
                value={shownRate || ''}
                step={50}
                placeholder={drafting ? 'Computing…' : '—'}
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
            <Btn icon="send" onClick={send} disabled={!draft || drafting || sending}>
              {sending ? 'Sending…' : 'Send on WhatsApp'}
            </Btn>
          </div>
          {urgency !== 'standard' && (
            <p className="fine muted">
              <UrgencyTag urgency={urgency} /> multiplier ×{URGENCY_MULTIPLIERS[urgency]} is baked into the rate.
            </p>
          )}
        </div>

        <div className="composer-right">
          <h4>Cost breakdown</h4>
          <p className="muted fine">{historyNote}</p>
          {draftError && <p className="error fine">{draftError}</p>}
          {drafting && !draft && <p className="muted fine">Computing the draft…</p>}
          {draft && (
            <>
              <StackedBar breakdown={draft.breakdown} />
              <dl className="breakdown-rows">
                <div>
                  <dt>Trip cost</dt>
                  <dd><Money value={draft.breakdown.operatingCost} /></dd>
                </div>
                <div>
                  <dt>Your margin <span className="muted">· {marginPct}%</span></dt>
                  <dd><Money value={shownMargin} className="sage-num" prefix="+" /></dd>
                </div>
                <div className="bd-total">
                  <dt>Quote to customer</dt>
                  <dd><Money value={shownRate} /></dd>
                </div>
              </dl>
              <p className="muted fine">
                Diesel at {formatINR(db.settings.dieselPrice)}/L · history
                auto-adjusts +2.6% per ₹5/L diesel move.
              </p>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
