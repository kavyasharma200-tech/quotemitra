import { useEffect, useState } from 'react';
import type { AppState, View } from './types';
import { loadState, saveState } from './lib/store';
import { Sidebar } from './components/Sidebar';
import { Landing } from './views/Landing';
import { Dashboard } from './views/Dashboard';
import { Inbox } from './views/Inbox';
import { Quotes } from './views/Quotes';
import { Lanes } from './views/Lanes';
import { Settings } from './views/Settings';

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [view, setView] = useState<View>('landing');

  useEffect(() => {
    saveState(state);
  }, [state]);

  const pendingCount = state.enquiries.filter((e) => e.status === 'new').length;

  if (view === 'landing') {
    return <Landing onEnter={() => setView('dashboard')} />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        view={view}
        onNav={setView}
        brokerName={state.broker.name}
        pendingCount={pendingCount}
      />
      <main className="main">
        {view === 'dashboard' && <Dashboard state={state} onNav={setView} />}
        {view === 'inbox' && <Inbox state={state} onChange={setState} />}
        {view === 'quotes' && <Quotes state={state} onChange={setState} />}
        {view === 'lanes' && <Lanes state={state} onChange={setState} />}
        {view === 'settings' && <Settings state={state} onChange={setState} />}
      </main>
    </div>
  );
}
