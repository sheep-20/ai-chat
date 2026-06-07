import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { KnowledgeCard, WorldConfig } from '../types';

const RARITY_LABEL: Record<string, string> = { common: '普通', rare: '稀有', legendary: '传说' };
const RARITY_COLOR: Record<string, string> = {
  common: '#94a3b8',
  rare: '#a78bfa',
  legendary: '#fbbf24',
};

interface Props {
  world: WorldConfig;
  unlockedIds: Set<string>;
  onClose: () => void;
}

export function EncyclopediaPanel({ world, unlockedIds, onClose }: Props) {
  const cards = world.knowledgeCards;
  const unlocked = cards.filter(c => unlockedIds.has(c.id));

  return (
    <AnimatePresence>
      <motion.div
        key="enc-panel"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="fixed top-0 right-0 h-full w-full max-w-sm z-40
                   flex flex-col border-l"
        style={{
          background: 'rgba(6,13,26,0.97)',
          borderColor: world.primaryColor + '30',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: world.primaryColor + '20' }}
        >
          <div>
            <div className="text-slate-200 font-semibold text-sm">世界图鉴</div>
            <div className="font-mono text-xs" style={{ color: world.primaryColor }}>
              {unlocked.length} / {cards.length} 已解锁
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center
                       text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-5 py-3 border-b" style={{ borderColor: world.primaryColor + '10' }}>
          <div className="h-1.5 bg-space-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(unlocked.length / cards.length) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${world.primaryColor}80, ${world.primaryColor})`,
                boxShadow: `0 0 8px ${world.primaryColor}`,
              }}
            />
          </div>
        </div>

        {/* Cards list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll">
          {cards.map((card, i) => {
            const isUnlocked = unlockedIds.has(card.id);
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-xl border p-4 transition-all duration-300
                            ${isUnlocked ? 'animate-card-reveal' : 'opacity-50'}`}
                style={{
                  borderColor: isUnlocked
                    ? RARITY_COLOR[card.rarity] + '40'
                    : '#1e293b',
                  background: isUnlocked
                    ? `linear-gradient(135deg, #0a1628, ${RARITY_COLOR[card.rarity]}08)`
                    : '#0a1628',
                  boxShadow: isUnlocked && card.rarity === 'legendary'
                    ? `0 0 16px ${RARITY_COLOR[card.rarity]}30`
                    : 'none',
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="text-2xl flex-shrink-0"
                    style={{
                      filter: isUnlocked
                        ? `drop-shadow(0 0 4px ${RARITY_COLOR[card.rarity]})`
                        : 'grayscale(1) brightness(0.3)',
                    }}
                  >
                    {isUnlocked ? card.icon : '🔒'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-slate-200 text-sm font-semibold">
                        {isUnlocked ? card.title : '???'}
                      </span>
                      <span
                        className="text-xs font-mono px-1.5 py-0.5 rounded-full border"
                        style={{
                          color: RARITY_COLOR[card.rarity],
                          borderColor: RARITY_COLOR[card.rarity] + '40',
                          background: RARITY_COLOR[card.rarity] + '10',
                        }}
                      >
                        {RARITY_LABEL[card.rarity]}
                      </span>
                    </div>
                    {isUnlocked ? (
                      <>
                        <div className="text-slate-500 text-xs font-mono mb-2">{card.subtitle}</div>
                        <p className="text-slate-400 text-xs leading-relaxed">{card.content}</p>
                      </>
                    ) : (
                      <p className="text-slate-600 text-xs">与 {world.npcName} 聊天以解锁</p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
