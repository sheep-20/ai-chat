import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import { WORLDS } from '../worlds';
import { storage } from '../utils/storage';
import { ParticleBackground } from './ParticleBackground';
import { WorldCard } from './WorldCard';

interface Props {
  onSelectWorld: (id: string) => void;
  onOpenSettings: () => void;
}

export function WorldSelectPage({ onSelectWorld, onOpenSettings }: Props) {
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
        </motion.div>

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
            聊天 · 探索 · 解锁图鉴 · 无任务 · 无剧情
          </span>
          <button
            onClick={onOpenSettings}
            className="text-slate-700 hover:text-slate-400 transition-colors"
            title="API 设置"
          >
            <Settings size={14} />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
