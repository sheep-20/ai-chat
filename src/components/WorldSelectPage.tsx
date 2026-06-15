import { motion } from 'framer-motion';
import { Clock3, Settings, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WORLDS } from '../worlds';
import { WORLD_SERIES } from '../worlds/series';
import { storage } from '../utils/storage';
import { ParticleBackground } from './ParticleBackground';
import { CompanionJournalPanel } from './CompanionJournalPanel';
import { WorldCard } from './WorldCard';
import type { UserProfile } from '../types';

interface Props {
  onSelectWorld: (id: string) => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
}

export function WorldSelectPage({ onSelectWorld, onOpenSettings, onOpenProfile }: Props) {
  const [showJournal, setShowJournal] = useState(false);
  const [activeWorldId, setActiveWorldId] = useState(() => WORLDS.find(world => world.available)?.id ?? WORLDS[0]?.id ?? '');
  const [activeSeriesId, setActiveSeriesId] = useState<string>('all');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [unlockedCounts, setUnlockedCounts] = useState<Record<string, number>>({});
  const [familiarityMap, setFamiliarityMap] = useState<Record<string, number>>({});
  const seriesTabs = [...WORLD_SERIES].sort((a, b) => a.order - b.order);
  const activeSeries = seriesTabs.find(series => series.id === activeSeriesId);
  const visibleWorlds = activeSeriesId === 'all'
    ? WORLDS
    : WORLDS.filter(world => world.seriesId === activeSeriesId);

  useEffect(() => {
    let alive = true;
    async function load() {
      const [profileState, unlockedEntries, familiarityEntries] = await Promise.all([
        storage.getProfileState(),
        Promise.all(WORLDS.map(async world => [world.id, (await storage.getUnlocked(world.id)).length] as const)),
        Promise.all(WORLDS.map(async world => [world.id, await storage.getFamiliarity(world.id)] as const)),
      ]);
      if (!alive) return;
      setProfile(profileState.profile);
      setUnlockedCounts(Object.fromEntries(unlockedEntries));
      setFamiliarityMap(Object.fromEntries(familiarityEntries));
    }
    load().catch(() => {});
    return () => { alive = false; };
  }, [showJournal]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-space-950 p-6 md:p-8">
      <ParticleBackground />

      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(6,182,212,0.03) 1px,transparent 1px),' +
            'linear-gradient(90deg,rgba(6,182,212,0.03) 1px,transparent 1px)',
          backgroundSize: '60px 60px',
          zIndex: 1,
        }}
      />

      <div className="fixed right-4 top-4 z-20 flex items-center gap-2 md:right-6 md:top-6">
        <button
          onClick={() => setShowJournal(true)}
          className="flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-mono text-slate-100 transition-all duration-200 hover:scale-105"
          style={{
            borderColor: 'rgba(6,182,212,0.35)',
            background: 'rgba(6,182,212,0.08)',
            boxShadow: '0 0 18px rgba(6,182,212,0.12)',
          }}
        >
          <Clock3 size={15} />
          <span className="hidden sm:inline">陪伴日志</span>
        </button>
        <button
          onClick={onOpenProfile}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/10 text-cyan-200 transition-colors hover:bg-cyan-500/20 hover:text-cyan-100"
          title="用户资料"
        >
          <UserRound size={16} />
        </button>
        <button
          onClick={onOpenSettings}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-space-700 bg-space-900/80 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
          title="API 设置"
        >
          <Settings size={16} />
        </button>
      </div>

      <main className="relative z-10 flex min-h-[calc(100vh-3rem)] flex-col items-center justify-center pt-16">
        <div className="flex w-full max-w-6xl flex-col items-center gap-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div
              className="font-orbitron text-5xl font-black tracking-[0.15em] text-cyan-400 md:text-6xl"
              style={{ textShadow: '0 0 40px rgba(6,182,212,0.9), 0 0 80px rgba(6,182,212,0.4)' }}
            >
              TIME ECHO
            </div>
            <div className="mt-4 font-mono text-sm tracking-[0.5em] text-slate-400">时间回声</div>
            <div className="mx-auto mt-8 h-px w-24 bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />
            <p className="mt-7 font-mono text-sm tracking-widest text-slate-500">
              选择一个档案分支
            </p>
            <p className="mt-3 text-xs text-slate-600">
              {profile?.displayName ? `${profile.displayName}，` : ''}每次退出对话后，系统都会自动留下陪伴日志。
            </p>
          </motion.div>

          <div className="flex w-full flex-wrap justify-center gap-3">
            {seriesTabs.map(series => {
              const selected = activeSeriesId === series.id;
              return (
                <button
                  key={series.id}
                  onClick={() => setActiveSeriesId(series.id)}
                  className="rounded-lg border px-4 py-2 text-sm font-mono transition-all duration-200"
                  style={{
                    color: selected ? series.themeColor : '#64748b',
                    borderColor: selected ? series.themeColor + '80' : '#1e293b',
                    background: selected ? series.themeColor + '12' : 'rgba(10,22,40,0.55)',
                    boxShadow: selected ? `0 0 18px ${series.themeColor}24` : 'none',
                  }}
                >
                  {series.name}
                </button>
              );
            })}
            <button
              onClick={() => setActiveSeriesId('all')}
              className="rounded-lg border px-4 py-2 text-sm font-mono transition-all duration-200"
              style={{
                color: activeSeriesId === 'all' ? '#e2e8f0' : '#64748b',
                borderColor: activeSeriesId === 'all' ? '#94a3b880' : '#1e293b',
                background: activeSeriesId === 'all' ? 'rgba(148,163,184,0.12)' : 'rgba(10,22,40,0.55)',
                boxShadow: activeSeriesId === 'all' ? '0 0 18px rgba(148,163,184,0.16)' : 'none',
              }}
            >
              全部
            </button>
          </div>

          <motion.div
            key={activeSeriesId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-3xl text-center"
          >
            <div className="text-sm font-semibold text-slate-200">
              {activeSeriesId === 'all' ? '全部档案分支' : activeSeries?.name}
            </div>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              {activeSeriesId === 'all'
                ? '查看时间回声档案库中当前开放的全部回声世界。'
                : activeSeries?.description}
            </p>
          </motion.div>

          <div className="grid w-full grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {visibleWorlds.map((world, i) => (
              <motion.div
                key={world.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.15, duration: 0.5 }}
                className="w-full max-w-[300px]"
              >
                <WorldCard
                  world={world}
                  unlockedCount={unlockedCounts[world.id] ?? 0}
                  familiarity={familiarityMap[world.id] ?? 0}
                  onClick={() => onSelectWorld(world.id)}
                />
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="text-center"
          >
            <span className="font-mono text-xs tracking-widest text-slate-700">
              聊天 · 陪伴日志 · 熟悉度 · 解锁图鉴 · 用户资料 · 世界偏好
            </span>
          </motion.div>
        </div>
      </main>

      {showJournal && (
        <CompanionJournalPanel
          activeWorldId={activeWorldId}
          onActiveWorldChange={setActiveWorldId}
          onClose={() => setShowJournal(false)}
        />
      )}
    </div>
  );
}
