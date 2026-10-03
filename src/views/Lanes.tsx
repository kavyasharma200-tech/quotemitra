// Lanes — the lane book. Your rate history per lane is what every quote
// is drafted from.

import { useState } from 'react';
import type { DbData, LocalLane } from '../types';
import { useDb } from '../lib/db';
import { Btn, EmptyState, Field, Modal, Money } from '../components/ui';
import { Icon } from '../components/Icon';
import { uid } from '../lib/store';
import { defaultMileageFor } from '../lib/quoteEngine';

const VEHICLES = [
  '14ft Eicher (5T)',
  '17ft Eicher (7T)',
  '19ft Eicher (9T)',
  '10-Wheeler (16T)',
  'Container 32ft (18T)',
  'Multi-Axle (25T)',
];

function LaneForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: LocalLane;
  onSave: (lane: LocalLane) => void;
  onClose: () => void;
}) {
  const [origin, setOrigin] = useState(initial?.origin ?? '');
  const [destination, setDestination] = useState(initial?.destination ?? '');
  const [distanceKm, setDistanceKm] = useState(initial?.distanceKm ?? 100);
  const [vehicleType, setVehicleType] = useState(initial?.vehicleType ?? VEHICLES[0]);
  const [mileageKmpl, setMileageKmpl] = useState(
    initial?.mileageKmpl ?? defaultMileageFor(VEHICLES[0]),
  );
  const [tollRs, setTollRs] = useState(initial?.tollRs ?? 400);
  const [typicalRateRs, setTypicalRateRs] = useState(initial?.typicalRateRs ?? 6000);

  const save = () => {
    if (!origin.trim() || !destination.trim() || distanceKm <= 0) return;
    onSave({
      id: initial?.id ?? uid('lane'),
      origin: origin.trim(),
      destination: destination.trim(),
      distanceKm: Number(distanceKm),
      vehicleType,
      mileageKmpl: Number(mileageKmpl) || 0,
      tollRs: Number(tollRs) || 0,
      typicalRateRs: Number(typicalRateRs) || 0,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
  };

  return (
    <Modal title={initial ? 'Edit lane' : 'Add lane'} onClose={onClose}>
      <div className="form-grid">
        <Field label="Origin">
          <input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Bokaro" />
        </Field>
        <Field label="Destination">
          <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Dhanbad" />
        </Field>
        <Field label="Distance (km)">
          <input type="number" min={1} value={distanceKm} onChange={(e) => setDistanceKm(Number(e.target.value) || 0)} />
        </Field>
        <Field label="Vehicle">
          <select
            value={vehicleType}
            onChange={(e) => {
              setVehicleType(e.target.value);
              if (!initial) setMileageKmpl(defaultMileageFor(e.target.value));
            }}
          >
            {VEHICLES.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Mileage (km/l)" hint="Fuel math uses this">
          <input type="number" min={0} step={0.1} value={mileageKmpl} onChange={(e) => setMileageKmpl(Number(e.target.value) || 0)} />
        </Field>
        <Field label="Toll estimate (₹)" hint="FASTag total for the lane">
          <input type="number" min={0} step={10} value={tollRs} onChange={(e) => setTollRs(Number(e.target.value) || 0)} />
        </Field>
        <Field label="Typical rate (₹)" hint="What this lane usually goes for">
          <input type="number" min={0} step={100} value={typicalRateRs} onChange={(e) => setTypicalRateRs(Number(e.target.value) || 0)} />
        </Field>
      </div>
      <div className="modal-actions">
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} icon="check">Save lane</Btn>
      </div>
    </Modal>
  );
}

export function Lanes({ db }: { db: DbData }) {
  const { addLane, updateLane, removeLane } = useDb();
  const [editing, setEditing] = useState<LocalLane | 'new' | null>(null);

  const save = (lane: LocalLane) => {
    const exists = db.lanes.some((l) => l.id === lane.id);
    void (exists ? updateLane(lane) : addLane(lane));
    setEditing(null);
  };

  const remove = (id: string) => {
    if (!window.confirm('Delete this lane? Past quotes keep their records.')) return;
    void removeLane(id);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="kicker small">Rate history</p>
          <h2>Lane book</h2>
          <p className="muted fine">Your rate history per lane — this is what every quote is drafted from.</p>
        </div>
        <Btn icon="plus" onClick={() => setEditing('new')}>
          Add lane
        </Btn>
      </div>

      {db.lanes.length === 0 ? (
        <EmptyState
          icon="route"
          title="No lanes yet"
          text="Add the routes you run most. Quotes get smarter as your lane book grows."
        />
      ) : (
        <ul className="lane-list">
          {db.lanes.map((l) => {
            const quotes = db.quotes.filter((q) => q.laneId === l.id);
            return (
              <li key={l.id} className="lane-row">
                <div className="lane-main">
                  <h3>
                    {l.origin} <Icon name="arrowR" size={14} className="inline-icon" /> {l.destination}
                  </h3>
                  <p className="muted fine">
                    {l.vehicleType} · {l.distanceKm} km · {l.mileageKmpl > 0 ? `${l.mileageKmpl} km/l` : 'mileage n/a'} · toll <Money value={l.tollRs} className="inline" />
                    {quotes.length > 0 && ` · ${quotes.length} quote${quotes.length > 1 ? 's' : ''} on record`}
                  </p>
                </div>
                <div className="lane-side">
                  <div className="lane-rate">
                    <span className="muted fine">Typical rate</span>
                    <Money value={l.typicalRateRs} className="lane-rate-num" />
                  </div>
                  <span className="lane-actions">
                    <button className="icon-btn" onClick={() => setEditing(l)} aria-label={`Edit ${l.origin} to ${l.destination}`}>
                      <Icon name="pencil" size={15} />
                    </button>
                    <button className="icon-btn danger" onClick={() => remove(l.id)} aria-label={`Delete ${l.origin} to ${l.destination}`}>
                      <Icon name="x" size={15} />
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <LaneForm
          initial={editing === 'new' ? undefined : editing}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
