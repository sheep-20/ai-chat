import { AnimatePresence, motion } from 'framer-motion';
import { Clock3, X } from 'lucide-react';
import { WORLDS } from '../worlds';
import { storage } from '../utils/storage';
import { formatCompanionDuration, getFamiliarityLabel } from '../utils/companionship';

interface Props {
  activeWorldId: string;
  onActiveWorldChange: (worldId: string) => void;
  onClose: () => void;
}

export function CompanionJournalPanel({ activeWorldId, onActiveWorldChange, onClose }: Props) {
  const activeWorld = WORLDS.find(world => world.id === activeWorldId) ?? WORLDS[0];
  const logs = storage.getCompanionLogs(activeWorld.id).slice().reverse();
  const familiarity = storage.getFamiliarity(activeWorld.id);

  return (
    <AnimatePresence>
      <motion.div
        key="companion-journal"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="fixed top-0 right-0 h-full w-full max-w-md z-40 flex flex-col border-l"
        style={{
          background: 'rgba(6,13,26,0.97)',
          borderColor: activeWorld.primaryColor + '30',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: activeWorld.primaryColor + '20' }}
        >
          <div>
            <div className="text-slate-200 font-semibold text-sm flex items-center gap-2">
              <Clock3 size={16} style={{ color: activeWorld.primaryColor }} />
              陪伴日志
            </div>
            <div className="font-mono text-xs" style={{ color: activeWorld.primaryColor }}>
              熟悉度 {familiarity} · {getFamiliarityLabel(familiarity)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-3 border-b space-y-2" style={{ borderColor: activeWorld.primaryColor + '12' }}>
          <div className="flex flex-wrap gap-2">
            {WORLDS.map(world => {
              const isActive = world.id === activeWorld.id;
              const count = storage.getCompanionLogs(world.id).length;

              return (
                <button
                  key={world.id}
                  onClick={() => onActiveWorldChange(world.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-mono border transition-all duration-200"
                  style={{
                    color: isActive ? world.primaryColor : '#94a3b8',
                    borderColor: isActive ? world.primaryColor + '55' : '#1e293b',
                    background: isActive ? world.primaryColor + '12' : '#0a1628',
                  }}
                >
                  {world.name} · {count}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            每次离开对话时，系统都会自动记录一次简单的陪伴总结。
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll">
          {logs.length > 0 ? (
            logs.map(log => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border p-4 space-y-3"
                style={{
                  borderColor: activeWorld.primaryColor + '28',
                  background: `linear-gradient(135deg, #0a1628, ${activeWorld.primaryColor}06)`,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-slate-200 text-sm font-semibold">
                      {new Date(log.endedAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-slate-500 text-xs font-mono mt-0.5">
                      {log.npcName} · {formatCompanionDuration(log.durationMs)}
                    </div>
                  </div>
                  <div className="text-right text-xs font-mono text-slate-500">
                    <div style={{ color: activeWorld.primaryColor }}>+{log.familiarityGain} 熟悉度</div>
                    <div>当前 {log.familiarityAfter}</div>
                  </div>
                </div>

                {log.topics.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {log.topics.map(topic => (
                      <span
                        key={topic}
                        className="px-2 py-1 rounded-full text-[11px] font-mono border"
                        style={{
                          color: activeWorld.primaryColor,
                          borderColor: activeWorld.primaryColor + '30',
                          background: activeWorld.primaryColor + '10',
                        }}
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-line">
                  {log.summary}
                </p>
              </motion.div>
            ))
          ) : (
            <div
              className="rounded-2xl border border-dashed p-6 text-center space-y-2"
              style={{ borderColor: activeWorld.primaryColor + '20' }}
            >
              <div className="text-slate-300 text-sm font-semibold">还没有陪伴日志</div>
              <p className="text-slate-600 text-xs leading-relaxed">
                先和 {activeWorld.npcName} 聊一轮，离开对话后这里就会出现今天的总结。
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}