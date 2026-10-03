import type { View } from '../types';
import { Icon, type IconName } from './Icon';

const ITEMS: { view: View; label: string; icon: IconName }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { view: 'inbox', label: 'Inbox', icon: 'chat' },
  { view: 'quotes', label: 'Quotes', icon: 'quote' },
  { view: 'lanes', label: 'Lanes', icon: 'route' },
  { view: 'settings', label: 'Settings', icon: 'settings' },
];

export function Sidebar({
  view,
  onNav,
  brokerName,
  pendingCount,
}: {
  view: View;
  onNav: (v: View) => void;
  brokerName: string;
  pendingCount: number;
}) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => onNav('dashboard')}>
        <span className="brand-mark">
          <Icon name="truck" size={20} />
        </span>
        <span className="brand-text">
          <strong>QuoteMitra</strong>
          <em>freight quotes, instantly</em>
        </span>
      </button>
      <nav className="nav">
        {ITEMS.map((item) => (
          <button
            key={item.view}
            className={`nav-item${view === item.view ? ' active' : ''}`}
            onClick={() => onNav(item.view)}
          >
            <Icon name={item.icon} size={18} />
            <span>{item.label}</span>
            {item.view === 'inbox' && pendingCount > 0 && (
              <span className="nav-count">{pendingCount}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="broker-chip">
          <span className="broker-avatar">{brokerName.charAt(0)}</span>
          <span className="broker-name">{brokerName}</span>
        </div>
        <button className="nav-item" onClick={() => onNav('landing')}>
          <Icon name="arrowRight" size={18} />
          <span>View site</span>
        </button>
      </div>
    </aside>
  );
}
