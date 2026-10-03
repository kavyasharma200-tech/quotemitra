// QuoteMitra app shell. DbProvider owns all data (API with localStorage
// fallback); this file owns view routing.

import { useState } from 'react';
import type { View } from './types';
import { DbProvider, useDb } from './lib/db';
import { Sidebar } from './components/Sidebar';
import { Landing } from './views/Landing';
import { Dashboard } from './views/Dashboard';
import { Inbox } from './views/Inbox';
import { Quotes } from './views/Quotes';
import { Lanes } from './views/Lanes';
import { Settings } from './views/Settings';

function Shell() {
  const { db, online } = useDb();
  const [view, setView] = useState<View>('landing');

  if (!db) {
    return (
      <div className="boot">
        <p className="kicker">QuoteMitra</p>
        <p className="muted">Opening your quoting desk…</p>
      </div>
    );
  }

  if (view === 'landing') {
    return <Landing onEnter={() => setView('dashboard')} />;
  }

  const pendingCount = db.enquiries.filter((e) => e.status === 'new').length;

  return (
    <div className="app-shell">
      <Sidebar
        view={view}
        onNav={setView}
        brokerName={db.settings.name}
        company={db.settings.company}
        pendingCount={pendingCount}
      />
      <main className="main" key={`${view}-${online === true ? 'live' : 'demo'}`}>
        {view === 'dashboard' && <Dashboard db={db} onNav={setView} />}
        {view === 'inbox' && <Inbox db={db} />}
        {view === 'quotes' && <Quotes db={db} />}
        {view === 'lanes' && <Lanes db={db} />}
        {view === 'settings' && <Settings db={db} />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <DbProvider>
      <Shell />
    </DbProvider>
  );
}
