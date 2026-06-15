import { motion } from 'framer-motion';
import type { WorldConfig } from '../types';
import { getFamiliarityLabel } from '../utils/companionship';
import { WORLD_SERIES } from '../worlds/series';

interface Props {
  world: WorldConfig;
  unlockedCount: number;
  familiarity: number;
  onClick: () => void;
}

export function WorldCard({ world, unlockedCount, familiarity, onClick }: Props) {
  const locked = !world.available;
  const total = world.knowledgeCards.length;
  const series = WORLD_SERIES.find(item => item.id === world.seriesId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!locked ? { y: -6, scale: 1.02 } : {}}
      transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
      onClick={!locked ? onClick : undefined}
      className={`relative select-none overflow-hidden rounded-2xl border ${locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      style={{
        borderColor: locked ? '#1e293b' : world.primaryColor + '80',
        background: `linear-gradient(145deg, #0a1628, ${world.glowColor.replace('0.35', '0.08')})`,
        boxShadow: locked ? 'none' : `0 0 24px ${world.glowColor}, inset 0 1px 0 ${world.primaryColor}20`,
        minWidth: 240,
        maxWidth: 300,
        width: '100%',
      }}
    >
      {!locked && (
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${world.primaryColor}, transparent)` }}
        />
      )}

      <div className="flex min-h-[430px] flex-col gap-4 p-7">
        <div
          className="self-start rounded border px-2 py-1 font-mono text-xs tracking-widest"
          style={{
            color: locked ? '#475569' : world.primaryColor,
            borderColor: locked ? '#1e293b' : world.primaryColor + '40',
            background: locked ? 'transparent' : world.primaryColor + '10',
          }}
        >
          {series?.name ?? world.era}
        </div>

        {world.statusLabel && (
          <div
            className="absolute right-4 top-4 rounded-full border px-2 py-1 font-mono text-[10px]"
            style={{
              color: locked ? '#64748b' : world.primaryColor,
              borderColor: locked ? '#1e293b' : world.primaryColor + '45',
              background: locked ? 'rgba(15,23,42,0.6)' : world.primaryColor + '10',
            }}
          >
            {world.statusLabel}
          </div>
        )}

        <div
          className="my-2 text-center font-orbitron text-5xl animate-float"
          style={{
            color: locked ? '#334155' : world.primaryColor,
            textShadow: locked ? 'none' : `0 0 20px ${world.primaryColor}`,
            animationDelay: `${(world.order % 4) * 0.35}s`,
          }}
        >
          {locked ? '◇' : world.npcIcon}
        </div>

        <div className="space-y-1 text-center">
          <div
            className="text-xl font-semibold tracking-wide"
            style={{ color: locked ? '#475569' : world.primaryColor }}
          >
            {locked ? '???' : world.npcName}
          </div>
          <div className="text-xs font-mono text-slate-500">
            {locked ? '未知' : world.npcTitle}
          </div>
          {!locked && <div className="text-[11px] font-mono text-slate-600">{world.era}</div>}
        </div>

        <div className="space-y-1 border-t border-white/5 pt-4 text-center">
          <div className="text-sm font-semibold text-slate-200">{world.name}</div>
          <div className="min-h-[2.5rem] text-xs leading-relaxed text-slate-500">
            {locked ? world.comingSoon : world.tagline}
          </div>
        </div>

        {!locked && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-slate-500">
              <span>图鉴</span>
              <span style={{ color: world.primaryColor }}>{unlockedCount}/{total}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-space-700">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${total ? (unlockedCount / total) * 100 : 0}%`,
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

        <div className="mt-auto">
          {!locked ? (
            <button
              className="w-full rounded-lg border py-2.5 font-orbitron text-sm font-semibold tracking-widest transition-all duration-300 hover:scale-[1.03]"
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
            <div className="py-2 text-center font-mono text-xs text-slate-600">
              敬请期待
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
