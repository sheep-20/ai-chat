import { useState, useEffect } from 'react';
import { storage } from './utils/storage';
import { SetupPage } from './components/SetupPage';
import { WorldSelectPage } from './components/WorldSelectPage';
import { ChatPage } from './components/ChatPage';
import type { AppPage } from './types';

export default function App() {
  const [hasKey, setHasKey] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [page, setPage] = useState<AppPage>({ type: 'home' });

  useEffect(() => {
    setHasKey(!!storage.getApiKey());
  }, []);

  if (!hasKey || showSettings) {
    return (
      <SetupPage
        isEditing={showSettings}
        onSetup={() => { setHasKey(true); setShowSettings(false); }}
        onCancel={showSettings ? () => setShowSettings(false) : undefined}
      />
    );
  }

  if (page.type === 'chat') {
    return (
      <ChatPage
        worldId={page.worldId}
        onBack={() => setPage({ type: 'home' })}
        onOpenSettings={() => setShowSettings(true)}
      />
    );
  }

  return (
    <WorldSelectPage
      onSelectWorld={(id) => setPage({ type: 'chat', worldId: id })}
      onOpenSettings={() => setShowSettings(true)}
    />
  );
}
