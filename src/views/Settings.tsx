import { useState } from 'react';
import type { AppState } from '../types';
import { Btn, Field } from '../components/ui';
import { resetState } from '../lib/store';

export function Settings({
  state,
  onChange,
}: {
  state: AppState;
  onChange: (s: AppState) => void;
}) {
  const [broker, setBroker] = useState(state.broker);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof typeof broker>(k: K, v: (typeof broker)[K]) =>
    setBroker({ ...broker, [k]: v });

  const save = () => {
    onChange({ ...state, broker });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="page narrow">
      <div className="page-head">
        <div>
          <h2>Settings</h2>
          <p className="muted">Your profile and the defaults every quote uses.</p>
        </div>
      </div>

      <section className="card stack">
        <h3>Broker profile</h3>
        <Field label="Your name">
          <input value={broker.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Company">
          <input value={broker.company} onChange={(e) => set('company', e.target.value)} />
        </Field>
        <Field label="Phone">
          <input value={broker.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
      </section>

      <section className="card stack">
        <h3>Quote defaults</h3>
        <Field
          label="Default margin (%)"
          hint="Added on top of trip cost. Most brokers keep 10–15%."
        >
          <input
            type="number"
            min={0}
            max={40}
            value={broker.defaultMarginPct}
            onChange={(e) => set('defaultMarginPct', Number(e.target.value) || 0)}
          />
        </Field>
        <Field
          label="Diesel price (₹/litre)"
          hint="Update when pump prices move — past lane rates auto-adjust."
        >
          <input
            type="number"
            min={50}
            max={150}
            step={0.5}
            value={broker.dieselPricePerLitre}
            onChange={(e) => set('dieselPricePerLitre', Number(e.target.value) || 0)}
          />
        </Field>
        <Btn onClick={save} icon="check">
          {saved ? 'Saved' : 'Save settings'}
        </Btn>
      </section>

      <section className="card stack danger-zone">
        <h3>Demo data</h3>
        <p className="muted">
          Reset everything back to the original demo lanes, quotes and enquiries.
        </p>
        <Btn variant="danger" onClick={() => onChange(resetState())}>
          Reset demo data
        </Btn>
      </section>
    </div>
  );
}
