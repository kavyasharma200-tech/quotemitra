// Shared building blocks — hand-written, no component libraries.

import type { ReactNode } from 'react';
import type {
  CostBreakdown,
  EnquiryStatus,
  QuoteStatus,
  Urgency,
} from '../types';
import { Icon, type IconName } from './Icon';
import { formatINR } from '../lib/quoteEngine';
import { useDb } from '../lib/db';

/* ---------------------------------- Money --------------------------------- */
/** Every rupee figure in the app renders through this — IBM Plex Mono. */
export function Money({
  value,
  className = '',
  prefix = '',
}: {
  value: number;
  className?: string;
  prefix?: string;
}) {
  return (
    <span className={`inr ${className}`}>
      {prefix}
      {formatINR(value)}
    </span>
  );
}

/* ---------------------------------- Buttons -------------------------------- */
export function Btn({
  children,
  onClick,
  variant = 'primary',
  icon,
  type = 'button',
  disabled,
  full,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  type?: 'button' | 'submit';
  disabled?: boolean;
  full?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn btn-${variant}${full ? ' btn-full' : ''}`}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

/* ---------------------------------- Fields --------------------------------- */
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

/* ---------------------------------- Modal ---------------------------------- */
export function Modal({
  title,
  sub,
  onClose,
  children,
  wide,
}: {
  title: string;
  sub?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal${wide ? ' modal-wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-head">
          <div>
            <h3>{title}</h3>
            {sub && <p className="muted fine">{sub}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* -------------------------------- Empty state ------------------------------- */
export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: IconName;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon name={icon} size={26} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

/* ------------------------------ Status pills -------------------------------- */
const ENQUIRY_PILL: Record<EnquiryStatus, { label: string; dot: string }> = {
  new: { label: 'New', dot: 'var(--dot-sage)' },
  quoted: { label: 'Quoted', dot: 'var(--dot-amber)' },
  closed: { label: 'Closed', dot: 'var(--dot-gray)' },
};

const QUOTE_PILL: Record<QuoteStatus, { label: string; dot: string }> = {
  draft: { label: 'Draft', dot: 'var(--dot-gray)' },
  sent: { label: 'Sent', dot: 'var(--dot-amber)' },
  won: { label: 'Won', dot: 'var(--dot-green)' },
  lost: { label: 'Lost', dot: 'var(--dot-red)' },
};

export function EnquiryPill({ status }: { status: EnquiryStatus }) {
  const p = ENQUIRY_PILL[status];
  return (
    <span className="pill">
      <i className="dot" style={{ background: p.dot }} />
      {p.label}
    </span>
  );
}

export function QuotePill({ status }: { status: QuoteStatus }) {
  const p = QUOTE_PILL[status];
  return (
    <span className="pill">
      <i className="dot" style={{ background: p.dot }} />
      {p.label}
    </span>
  );
}

const URGENCY_TAG: Record<Urgency, { label: string; dot: string }> = {
  standard: { label: 'Standard', dot: 'var(--dot-gray)' },
  urgent: { label: 'Urgent', dot: 'var(--dot-amber)' },
  'same-day': { label: 'Same-day', dot: 'var(--dot-red)' },
};

export function UrgencyTag({ urgency }: { urgency: Urgency }) {
  const u = URGENCY_TAG[urgency];
  return (
    <span className="pill subtle">
      <i className="dot" style={{ background: u.dot }} />
      {u.label}
    </span>
  );
}

/* ------------------------------- Stacked bar -------------------------------- */
/**
 * Horizontal stacked-bar cost breakdown: fuel / toll / driver / labour /
 * margin segments with a legend. The signature QuoteMitra visual.
 */
const SEGMENTS: Array<{
  key: keyof Pick<CostBreakdown, 'fuel' | 'toll' | 'driverBata' | 'handling' | 'marginRs'>;
  label: string;
  color: string;
}> = [
  { key: 'fuel', label: 'Diesel & running', color: 'var(--seg-fuel)' },
  { key: 'toll', label: 'Toll (FASTag)', color: 'var(--seg-toll)' },
  { key: 'driverBata', label: 'Driver bata', color: 'var(--seg-driver)' },
  { key: 'handling', label: 'Loading / unloading', color: 'var(--seg-labour)' },
  { key: 'marginRs', label: 'Your margin', color: 'var(--seg-margin)' },
];

export function StackedBar({ breakdown }: { breakdown: CostBreakdown }) {
  const total = breakdown.finalRate || 1;
  return (
    <div className="stacked">
      <div
        className="stacked-bar"
        role="img"
        aria-label={`Cost breakdown totalling ${formatINR(breakdown.finalRate)}`}
      >
        {SEGMENTS.map((s) => {
          const v = Math.max(0, breakdown[s.key]);
          const pct = Math.max(v / total * 100, v > 0 ? 2 : 0);
          return (
            <span
              key={s.key}
              className="stacked-seg"
              style={{ width: `${pct}%`, background: s.color }}
              title={`${s.label}: ${formatINR(v)}`}
            />
          );
        })}
      </div>
      <ul className="stacked-legend">
        {SEGMENTS.map((s) => (
          <li key={s.key}>
            <i className="dot" style={{ background: s.color }} />
            <span className="stacked-label">{s.label}</span>
            <Money value={breakdown[s.key]} className="stacked-val" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------ Terminal stat ------------------------------- */
export function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`tstat${accent ? ' accent' : ''}`}>
      <div className="tstat-label">{label}</div>
      <div className="tstat-value">{value}</div>
      {sub && <div className="tstat-sub">{sub}</div>}
    </div>
  );
}

/* ------------------------------- Section head ------------------------------- */
export function SectionHead({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        <h3>{title}</h3>
        {sub && <p className="muted fine">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------ Demo-mode badge ----------------------------- */
/** Honest indicator: visible only when the API is unreachable. */
export function DemoBadge() {
  const { online } = useDb();
  if (online !== false) return null;
  return (
    <span className="demo-badge" title="The API didn't answer, so you're seeing local demo data.">
      <i className="dot" style={{ background: 'var(--dot-amber)' }} />
      Demo mode — local data
    </span>
  );
}
