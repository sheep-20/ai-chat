import { motion } from 'framer-motion';
import type { WorldConfig } from '../types';
import { getFamiliarityLabel } from '../utils/companionship';

interface Props {
  world: WorldConfig;
  unlockedCount: number;
  familiarity: number;
  onClick: () => void;
}

export function WorldCard({ world, unlockedCount, familiarity, onClick }: Props) {
  const locked = !world.available;
  const total = world.knowledgeCards.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!locked ? { y: -6, scale: 1.02 } : {}}
      transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
      onClick={!locked ? onClick : undefined}
      className={`relative rounded-2xl border overflow-hidden select-none
                  ${locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      style={{
        borderColor: locked ? '#1e293b' : world.primaryColor + '80',
        background: `linear-gradient(145deg, #0a1628, ${world.glowColor.replace('0.35', '0.08')})`,
        boxShadow: locked ? 'none' : `0 0 24px ${world.glowColor}, inset 0 1px 0 ${world.primaryColor}20`,
        minWidth: 240,
        maxWidth: 300,
        width: '100%',
      }}
    >
      {/* Top accent line */}
      {!locked && (
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${world.primaryColor}, transparent)` }}
        />
      )}

      <div className="p-7 flex flex-col gap-4">
        {/* Era badge */}
        <div
          className="font-mono text-xs tracking-widest self-start px-2 py-1 rounded border"
          style={{
            color: locked ? '#475569' : world.primaryColor,
            borderColor: locked ? '#1e293b' : world.primaryColor + '40',
            background: locked ? 'transparent' : world.primaryColor + '10',
          }}
        >
          {world.era}
        </div>

        {/* NPC Avatar */}
        <div
          className="text-5xl font-orbitron text-center my-2 animate-float"
          style={{
            color: locked ? '#334155' : world.primaryColor,
            textShadow: locked ? 'none' : `0 0 20px ${world.primaryColor}`,
            animationDelay: Math.random() * 2 + 's',
          }}
        >
          {locked ? '🔒' : world.npcAvatar}
        </div>

        {/* Names */}
        <div className="text-center space-y-1">
          <div
            className="text-xl font-semibold tracking-wide"
            style={{ color: locked ? '#475569' : world.primaryColor }}
          >
            {locked ? '???' : world.npcName}
          </div>
          <div className="text-slate-500 text-xs font-mono">
            {locked ? '未知' : world.npcTitle}
          </div>
        </div>

        {/* World name & tagline */}
        <div className="text-center border-t border-white/5 pt-4 space-y-1">
          <div className="text-slate-200 font-semibold text-sm">{world.name}</div>
          <div className="text-slate-500 text-xs leading-relaxed">
            {locked ? world.comingSoon : world.tagline}
          </div>
        </div>

        {/* Progress or button */}
        {!locked && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-slate-500">
              <span>图鉴</span>
              <span style={{ color: world.primaryColor }}>{unlockedCount}/{total}</span>
            </div>
            <div className="h-1 bg-space-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${(unlockedCount / total) * 100}%`,
                  background: `linear-gradient(90deg, ${world.primaryColor}80, ${world.primaryColor})`,
                  boxShadow: `0 0 8px ${world.primaryColor}`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs font-mono text-slate-500">
              <span>熟悉度</span>
              <span style={{ color: world.primaryColor }}>
                {getFamiliarityLabel(familiarity)} · {familiarity}
              </span>
            </div>
          </div>
        )}

        {!locked ? (
          <button
            className="w-full py-2.5 rounded-lg text-sm font-orbitron tracking-widest font-semibold
                       border transition-all duration-300 hover:scale-[1.03]"
            style={{
              color: world.primaryColor,
              borderColor: world.primaryColor + '60',
              background: world.primaryColor + '10',
              boxShadow: `0 0 12px ${world.primaryColor}20`,
            }}
          >
            进入 →
          </button>
        ) : (
          <div className="text-center text-slate-600 text-xs font-mono py-2">
            敬请期待
          </div>
        )}
      </div>
    </motion.div>
  );
}
