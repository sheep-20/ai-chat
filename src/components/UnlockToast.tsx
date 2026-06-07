import { motion, AnimatePresence } from 'framer-motion';
import type { KnowledgeCard, WorldConfig } from '../types';

const RARITY_LABEL: Record<string, string> = {
  common: '普通',
  rare: '稀有',
  legendary: '传说',
};

const RARITY_COLOR: Record<string, string> = {
  common: '#94a3b8',
  rare: '#a78bfa',
  legendary: '#fbbf24',
};

interface Props {
  card: KnowledgeCard | null;
  world: WorldConfig;
}

export function UnlockToast({ card, world }: Props) {
  return (
    <AnimatePresence>
      {card && (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 60, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50
                     rounded-2xl border px-5 py-4 flex items-center gap-4
                     backdrop-blur-md shadow-2xl"
          style={{
            background: `linear-gradient(135deg, #0a1628, ${world.glowColor.replace('0.35', '0.15')})`,
            borderColor: world.primaryColor + '60',
            boxShadow: `0 0 30px ${world.glowColor}, 0 8px 32px rgba(0,0,0,0.5)`,
            minWidth: 280,
            maxWidth: 380,
          }}
        >
          {/* Icon */}
          <div
            className="text-3xl flex-shrink-0 animate-float"
            style={{ filter: `drop-shadow(0 0 6px ${RARITY_COLOR[card.rarity]})` }}
          >
            {card.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-mono" style={{ color: world.primaryColor }}>
                ✦ 图鉴解锁
              </span>
              <span
                className="text-xs font-mono px-1.5 py-0.5 rounded-full border"
                style={{
                  color: RARITY_COLOR[card.rarity],
                  borderColor: RARITY_COLOR[card.rarity] + '50',
                  background: RARITY_COLOR[card.rarity] + '10',
                }}
              >
                {RARITY_LABEL[card.rarity]}
              </span>
            </div>
            <div className="text-slate-200 font-semibold text-sm truncate">{card.title}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
