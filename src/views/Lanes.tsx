import { useState } from 'react';
import type { AppState, Lane, VehicleType } from '../types';
import { Btn, EmptyState, Field, Modal } from '../components/ui';
import { Icon } from '../components/Icon';
import { formatINR } from '../lib/quoteEngine';
import { uid } from '../lib/store';

const VEHICLES: VehicleType[] = [
  '14ft Eicher (5T)',
  '17ft Eicher (7T)',
  '19ft Eicher (9T)',
  '10-Wheeler (16T)',
  'Container 32ft (18T)',
  'Multi-Axle (25T)',
];

const VEHICLE_DEFAULTS: Record<VehicleType, { capacityT: number; mileageKmpl: number }> = {
  '14ft Eicher (5T)': { capacityT: 5, mileageKmpl: 7.5 },
  '17ft Eicher (7T)': { capacityT: 7, mileageKmpl: 6.2 },
  '19ft Eicher (9T)': { capacityT: 9, mileageKmpl: 5.5 },
  '10-Wheeler (16T)': { capacityT: 16, mileageKmpl: 4.2 },
  'Container 32ft (18T)': { capacityT: 18, mileageKmpl: 4.0 },
  'Multi-Axle (25T)': { capacityT: 25, mileageKmpl: 3.6 },
};

function LaneForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Lane;
  onSave: (lane: Lane) => void;
  onClose: () => void;
}) {
  const [origin, setOrigin] = useState(initial?.origin ?? '');
  const [destination, setDestination] = useState(initial?.destination ?? '');
  const [distanceKm, setDistanceKm] = useState(initial?.distanceKm ?? 100);
  const [vehicleType, setVehicleType] = useState<VehicleType>(
    initial?.vehicleType ?? '14ft Eicher (5T)',
  );
  const [tollEstimate, setTollEstimate] = useState(initial?.tollEstimate ?? 400);
  const [typicalRate, setTypicalRate] = useState(initial?.typicalRate ?? 6000);

  const save = () => {
    if (!origin.trim() || !destination.trim() || distanceKm <= 0) return;
    const def = VEHICLE_DEFAULTS[vehicleType];
    onSave({
      id: initial?.id ?? uid('lane'),
      origin: origin.trim(),
      destination: destination.trim(),
      distanceKm: Number(distanceKm),
      vehicleType,
      capacityT: def.capacityT,
      mileageKmpl: initial?.mileageKmpl ?? def.mileageKmpl,
      tollEstimate: Number(tollEstimate),
      typicalRate: Number(typicalRate),
      lastRateAt: new Date().toISOString(),
    });
  };

  const input = (
    value: string | number,
    set: (v: string) => void,
    type = 'text',
  ) => (
    <input
      type={type}
      value={value}
      onChange={(e) => set(e.target.value)}
    />
  );

  return (
    <Modal title={initial ? 'Edit lane' : 'Add lane'} onClose={onClose}>
      <div className="form-grid">
        <Field label="Origin">{input(origin, setOrigin)}</Field>
        <Field label="Destination">{input(destination, setDestination)}</Field>
        <Field label="Distance (km)">
          {input(String(distanceKm), (v) => setDistanceKm(Number(v) || 0), 'number')}
        </Field>
        <Field label="Vehicle">
          <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value as VehicleType)}>
            {VEHICLES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Toll estimate (₹)" hint="FASTag total for the lane">
          {input(String(tollEstimate), (v) => setTollEstimate(Number(v) || 0), 'number')}
        </Field>
        <Field label="Typical rate (₹)" hint="What this lane usually goes for">
          {input(String(typicalRate), (v) => setTypicalRate(Number(v) || 0), 'number')}
        </Field>
      </div>
      <div className="modal-actions">
        <Btn variant="secondary" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={save} icon="check">
          Save lane
        </Btn>
      </div>
    </Modal>
  );
}

export function Lanes({
  state,
  onChange,
}: {
  state: AppState;
  onChange: (s: AppState) => void;
}) {
  const [editing, setEditing] = useState<Lane | 'new' | null>(null);

  const save = (lane: Lane) => {
    const exists = state.lanes.some((l) => l.id === lane.id);
    onChange({
      ...state,
      lanes: exists
        ? state.lanes.map((l) => (l.id === lane.id ? lane : l))
        : [...state.lanes, lane],
    });
    setEditing(null);
  };

  const remove = (id: string) => {
    if (!window.confirm('Delete this lane? Past quotes keep their records.')) return;
    onChange({ ...state, lanes: state.lanes.filter((l) => l.id !== id) });
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Lane book</h2>
          <p className="muted">
            Your rate history per lane — this is what every quote is drafted from.
          </p>
        </div>
        <Btn icon="plus" onClick={() => setEditing('new')}>
          Add lane
        </Btn>
      </div>

      {state.lanes.length === 0 ? (
        <EmptyState
          icon="route"
          title="No lanes yet"
          text="Add the routes you run most. Quotes get smarter as your lane book grows."
        />
      ) : (
        <div className="lane-grid">
          {state.lanes.map((l) => (
            <div className="card lane-card" key={l.id}>
              <div className="lane-top">
                <h3>
                  {l.origin} <Icon name="arrowRight" size={14} /> {l.destination}
                </h3>
                <span className="lane-actions">
                  <button className="icon-btn" onClick={() => setEditing(l)} aria-label="Edit lane">
                    <Icon name="pencil" size={16} />
                  </button>
                  <button className="icon-btn danger" onClick={() => remove(l.id)} aria-label="Delete lane">
                    <Icon name="x" size={16} />
                  </button>
                </span>
              </div>
              <div className="lane-meta">
                <span>
                  <Icon name="truck" size={14} /> {l.vehicleType}
                </span>
                <span>
                  <Icon name="route" size={14} /> {l.distanceKm} km
                </span>
              </div>
              <div className="lane-rate">
                <span className="muted">Typical rate</span>
                <strong>{formatINR(l.typicalRate)}</strong>
              </div>
              <div className="lane-foot muted">
                Toll ≈ {formatINR(l.tollEstimate)} · {l.mileageKmpl} km/l
              </div>
            </div>
          ))}
        </div>
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
