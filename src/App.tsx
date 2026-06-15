import { useState, useEffect } from 'react';
import { storage } from './utils/storage';
import { SetupPage } from './components/SetupPage';
import { WorldSelectPage } from './components/WorldSelectPage';
import { ChatPage } from './components/ChatPage';
import { UserProfileGate } from './components/UserProfileGate';
import { IntroStoryGate } from './components/IntroStoryGate';
import type { AppPage } from './types';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [hasIntroStory, setHasIntroStory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [page, setPage] = useState<AppPage>({ type: 'home' });

  useEffect(() => {
    let alive = true;
    async function loadState() {
      const [settings, profileState, introDone] = await Promise.all([
        storage.getSettings(),
        storage.getProfileState(),
        storage.getIntroStoryDone(),
      ]);
      if (!alive) return;
      setHasKey(settings.hasApiKey);
      setHasProfile(profileState.onboardingDone && !!profileState.profile);
      setHasIntroStory(introDone);
      setIsReady(true);
    }
    loadState().catch(() => setIsReady(true));
    return () => { alive = false; };
  }, []);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-space-950 font-mono text-sm text-cyan-300">
        正在连接本地档案库...
      </div>
    );
  }

  if (!hasKey || showSettings) {
    return (
      <SetupPage
        isEditing={showSettings}
        onSetup={() => { setHasKey(true); setShowSettings(false); }}
        onCancel={showSettings ? () => setShowSettings(false) : undefined}
      />
    );
  }

  if (!hasIntroStory) {
    return (
      <IntroStoryGate
        onComplete={() => {
          void storage.setIntroStoryDone();
          setHasIntroStory(true);
        }}
      />
    );
  }

  if (!hasProfile) {
    return (
      <UserProfileGate
        mode="onboarding"
        onComplete={() => setHasProfile(true)}
      />
    );
  }

  if (page.type === 'chat') {
    return (
      <>
        <ChatPage
          worldId={page.worldId}
          onBack={() => setPage({ type: 'home' })}
          onOpenSettings={() => setShowSettings(true)}
          onOpenProfile={() => setShowProfile(true)}
        />
        {showProfile && (
          <UserProfileGate
            mode="modal"
            onComplete={() => setShowProfile(false)}
            onCancel={() => setShowProfile(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <WorldSelectPage
        onSelectWorld={(id) => setPage({ type: 'chat', worldId: id })}
        onOpenSettings={() => setShowSettings(true)}
        onOpenProfile={() => setShowProfile(true)}
      />
      {showProfile && (
        <UserProfileGate
          mode="modal"
          onComplete={() => setShowProfile(false)}
          onCancel={() => setShowProfile(false)}
        />
      )}
    </>
  );
}
