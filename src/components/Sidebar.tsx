// App navigation: left sidebar on desktop, compact top bar + fixed bottom
// tab bar on mobile. Hairlines, no cards.

import type { View } from '../types';
import { Icon, type IconName } from './Icon';
import { DemoBadge } from './ui';

const ITEMS: Array<{ view: View; label: string; icon: IconName }> = [
  { view: 'dashboard', label: 'Desk', icon: 'dashboard' },
  { view: 'inbox', label: 'Inbox', icon: 'chat' },
  { view: 'quotes', label: 'Quotes', icon: 'quote' },
  { view: 'lanes', label: 'Lanes', icon: 'route' },
  { view: 'settings', label: 'Settings', icon: 'settings' },
];

export function Sidebar({
  view,
  onNav,
  brokerName,
  company,
  pendingCount,
}: {
  view: View;
  onNav: (v: View) => void;
  brokerName: string;
  company: string;
  pendingCount: number;
}) {
  return (
    <>
      <aside className="side">
        <button className="brand" onClick={() => onNav('dashboard')} aria-label="QuoteMitra home">
          <span className="brand-mark">
            <Icon name="truck" size={20} />
          </span>
          <span className="brand-text">
            <strong>QuoteMitra</strong>
            <em>freight quotes, instantly</em>
          </span>
        </button>

        <nav className="nav" aria-label="Primary">
          {ITEMS.map((item) => (
            <button
              key={item.view}
              className={`nav-item${view === item.view ? ' active' : ''}`}
              onClick={() => onNav(item.view)}
              aria-current={view === item.view ? 'page' : undefined}
            >
              <Icon name={item.icon} size={18} />
              <span className="nav-label">{item.label}</span>
              {item.view === 'inbox' && pendingCount > 0 && (
                <span className="nav-count">{pendingCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="side-foot">
          <DemoBadge />
          <div className="broker-chip">
            <span className="broker-avatar">{brokerName.charAt(0) || '?'}</span>
            <span className="broker-meta">
              <strong>{brokerName || 'Broker'}</strong>
              <em>{company}</em>
            </span>
          </div>
          <button className="nav-item ghost" onClick={() => onNav('landing')}>
            <Icon name="arrowR" size={16} />
            <span className="nav-label">View site</span>
          </button>
        </div>
      </aside>

      {/* Mobile: compact top bar … */}
      <header className="mtop">
        <button className="brand" onClick={() => onNav('dashboard')} aria-label="QuoteMitra home">
          <span className="brand-mark">
            <Icon name="truck" size={18} />
          </span>
          <strong>QuoteMitra</strong>
        </button>
        <DemoBadge />
      </header>

      {/* … and bottom tab bar. */}
      <nav className="mtabs" aria-label="Primary">
        {ITEMS.map((item) => (
          <button
            key={item.view}
            className={`mtab${view === item.view ? ' active' : ''}`}
            onClick={() => onNav(item.view)}
            aria-current={view === item.view ? 'page' : undefined}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
            {item.view === 'inbox' && pendingCount > 0 && (
              <em className="nav-count">{pendingCount}</em>
            )}
          </button>
        ))}
      </nav>
    </>
  );
}
