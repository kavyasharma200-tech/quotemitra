// Settings — broker profile, quote defaults, and data controls.

import { useEffect, useState } from 'react';
import type { DbData, Settings as SettingsType } from '../types';
import { useDb } from '../lib/db';
import { Btn, DemoBadge, Field } from '../components/ui';
import { Icon } from '../components/Icon';

export function Settings({ db }: { db: DbData }) {
  const { saveSettings, resetDemo, refresh, online } = useDb();
  const [form, setForm] = useState<SettingsType>(db.settings);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(db.settings);
  }, [db.settings]);

  const set = <K extends keyof SettingsType>(k: K, v: SettingsType[K]) =>
    setForm({ ...form, [k]: v });

  const save = async () => {
    setSaving(true);
    try {
      await saveSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page narrow">
      <div className="page-head">
        <div>
          <p className="kicker small">Configuration</p>
          <h2>Settings</h2>
          <p className="muted fine">Your profile and the defaults every quote uses.</p>
        </div>
      </div>

      <section className="panel">
        <h3>Broker profile</h3>
        <div className="stack">
          <Field label="Your name">
            <input value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Company">
            <input value={form.company} onChange={(e) => set('company', e.target.value)} />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="panel">
        <h3>Quote defaults</h3>
        <div className="form-grid">
          <Field label="Default margin (%)" hint="Added on top of trip cost. Most brokers keep 10–15%.">
            <input
              type="number"
              min={0}
              max={40}
              value={form.defaultMarginPct}
              onChange={(e) => set('defaultMarginPct', Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Diesel price (₹/litre)" hint="Past lane rates auto-adjust +2.6% per ₹5/L move.">
            <input
              type="number"
              min={50}
              max={150}
              step={0.5}
              value={form.dieselPrice}
              onChange={(e) => set('dieselPrice', Number(e.target.value) || 0)}
            />
          </Field>
        </div>
        <div className="panel-foot">
          <Btn onClick={save} icon="check" disabled={saving}>
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save settings'}
          </Btn>
        </div>
      </section>

      <section className="panel">
        <h3>Data</h3>
        <div className="data-rows">
          <div className="data-row">
            <div>
              <strong>Connection</strong>
              <p className="muted fine">
                {online === null && 'Checking the API…'}
                {online === true && 'Connected to the QuoteMitra API. Quotes, lanes and enquiries sync to the server.'}
                {online === false && 'The API is unreachable — the app is running on local demo data in your browser.'}
              </p>
            </div>
            <DemoBadge />
          </div>
          <div className="data-row">
            <div>
              <strong>{online === false ? 'Reset demo data' : 'Reload from server'}</strong>
              <p className="muted fine">
                {online === false
                  ? 'Restore the original demo lanes, quotes and enquiries.'
                  : 'Re-fetch everything from the API.'}
              </p>
            </div>
            {online === false ? (
              <Btn variant="danger" onClick={resetDemo} icon="alert">
                Reset demo data
              </Btn>
            ) : (
              <Btn variant="secondary" onClick={() => void refresh()} icon="check">
                Reload
              </Btn>
            )}
          </div>
        </div>
      </section>

      <p className="fine faint settings-note">
        <Icon name="check" size={12} className="inline-icon" />
        Your data {online === false ? 'stays in this browser' : 'syncs to your QuoteMitra account'}.
      </p>
    </div>
  );
}
