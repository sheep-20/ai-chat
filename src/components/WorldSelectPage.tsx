import { motion } from 'framer-motion';
import { Clock3, Settings } from 'lucide-react';
import { useState } from 'react';
import { WORLDS } from '../worlds';
import { storage } from '../utils/storage';
import { ParticleBackground } from './ParticleBackground';
import { CompanionJournalPanel } from './CompanionJournalPanel';
import { WorldCard } from './WorldCard';

interface Props {
  onSelectWorld: (id: string) => void;
  onOpenSettings: () => void;
}

export function WorldSelectPage({ onSelectWorld, onOpenSettings }: Props) {
  const [showJournal, setShowJournal] = useState(false);
  const [activeWorldId, setActiveWorldId] = useState(() => WORLDS.find(world => world.available)?.id ?? WORLDS[0]?.id ?? '');

  return (
    <div className="relative min-h-screen bg-space-950 flex flex-col items-center justify-center p-8 overflow-hidden">
      <ParticleBackground />

      {/* Grid overlay */}
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

      <div className="relative z-10 flex flex-col items-center gap-14 w-full max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-3"
        >
          <div
            className="font-orbitron text-5xl md:text-6xl font-black tracking-[0.15em] text-cyan-400"
            style={{ textShadow: '0 0 40px rgba(6,182,212,0.9), 0 0 80px rgba(6,182,212,0.4)' }}
          >
            TIME ECHO
          </div>
          <div className="font-mono text-slate-400 tracking-[0.5em] text-sm">时 间 回 声</div>
          <div className="mt-4 w-24 h-px mx-auto bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />
          <p className="text-slate-500 text-sm mt-3 font-mono tracking-widest">
            — 选择一个时间坐标 —
          </p>
          <p className="text-slate-600 text-xs mt-2 font-mono">
            每次退出对话后，系统都会自动留下陪伴日志。
          </p>
        </motion.div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowJournal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-mono border transition-all duration-200 hover:scale-105"
            style={{
              color: '#f8fafc',
              borderColor: 'rgba(6,182,212,0.35)',
              background: 'rgba(6,182,212,0.08)',
              boxShadow: '0 0 18px rgba(6,182,212,0.12)',
            }}
          >
            <Clock3 size={15} />
            陪伴日志
          </button>
          <button
            onClick={onOpenSettings}
            className="text-slate-700 hover:text-slate-400 transition-colors"
            title="API 设置"
          >
            <Settings size={14} />
          </button>
        </div>

        {/* World Cards */}
        <div className="flex flex-wrap justify-center gap-6 w-full">
          {WORLDS.map((world, i) => (
            <motion.div
              key={world.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.15, duration: 0.5 }}
            >
              <WorldCard
                world={world}
                unlockedCount={storage.getUnlocked(world.id).length}
                familiarity={storage.getFamiliarity(world.id)}
                onClick={() => onSelectWorld(world.id)}
              />
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="flex items-center gap-4"
        >
          <span className="text-slate-700 text-xs font-mono tracking-widest">
            聊天 · 陪伴日志 · 熟悉度 · 解锁图鉴 · 无任务 · 无剧情
          </span>
        </motion.div>
      </div>

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
