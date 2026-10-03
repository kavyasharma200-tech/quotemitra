import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/* Small shared building blocks — all custom, no library components. */

export function StatCard({
  icon,
  label,
  value,
  sub,
  tone = 'sage',
}: {
  icon: IconName;
  label: string;
  value: string;
  sub?: string;
  tone?: 'sage' | 'ink' | 'warm';
}) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-icon">
        <Icon name={icon} size={20} />
      </div>
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = 'sage',
}: {
  children: ReactNode;
  tone?: 'sage' | 'ink' | 'warm' | 'rose' | 'mist';
}) {
  return <span className={`badge tone-${tone}`}>{children}</span>;
}

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
        <Icon name={icon} size={28} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
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
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

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
