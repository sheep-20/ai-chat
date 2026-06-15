import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock3, X } from 'lucide-react';
import { WORLDS } from '../worlds';
import { storage } from '../utils/storage';
import { formatCompanionDuration, getFamiliarityLabel } from '../utils/companionship';
import type { CompanionLog } from '../types';

interface Props {
  activeWorldId: string;
  onActiveWorldChange: (worldId: string) => void;
  onClose: () => void;
}

export function CompanionJournalPanel({ activeWorldId, onActiveWorldChange, onClose }: Props) {
  const activeWorld = WORLDS.find(world => world.id === activeWorldId) ?? WORLDS[0];
  const [logs, setLogs] = useState<CompanionLog[]>([]);
  const [familiarity, setFamiliarity] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      const [activeLogs, activeFamiliarity, countEntries] = await Promise.all([
        storage.getCompanionLogs(activeWorld.id),
        storage.getFamiliarity(activeWorld.id),
        Promise.all(WORLDS.map(async world => [world.id, (await storage.getCompanionLogs(world.id)).length] as const)),
      ]);
      if (!alive) return;
      setLogs(activeLogs.slice().reverse());
      setFamiliarity(activeFamiliarity);
      setCounts(Object.fromEntries(countEntries));
      setLoading(false);
    }
    load().catch(() => setLoading(false));
    return () => { alive = false; };
  }, [activeWorld.id]);

  return (
    <AnimatePresence>
      <motion.div
        key="companion-journal"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="fixed right-0 top-0 z-40 flex h-full w-full max-w-md flex-col border-l"
        style={{
          background: 'rgba(6,13,26,0.97)',
          borderColor: activeWorld.primaryColor + '30',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: activeWorld.primaryColor + '20' }}
        >
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Clock3 size={16} style={{ color: activeWorld.primaryColor }} />
              陪伴日志
            </div>
            <div className="font-mono text-xs" style={{ color: activeWorld.primaryColor }}>
              熟悉度 {familiarity} · {getFamiliarityLabel(familiarity)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2 border-b px-4 py-3" style={{ borderColor: activeWorld.primaryColor + '12' }}>
          <div className="flex flex-wrap gap-2">
            {WORLDS.map(world => {
              const isActive = world.id === activeWorld.id;
              return (
                <button
                  key={world.id}
                  onClick={() => onActiveWorldChange(world.id)}
                  className="rounded-full border px-3 py-1.5 font-mono text-xs transition-all duration-200"
                  style={{
                    color: isActive ? world.primaryColor : '#94a3b8',
                    borderColor: isActive ? world.primaryColor + '55' : '#1e293b',
                    background: isActive ? world.primaryColor + '12' : '#0a1628',
                  }}
                >
                  {world.name} · {counts[world.id] ?? 0}
                </button>
              );
            })}
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            每次点击返回离开对话时，系统会调用大模型记录一段新的陪伴总结；失败时使用本地兜底总结。
          </p>
        </div>

        <div className="custom-scroll flex-1 space-y-3 overflow-y-auto p-4">
          {loading ? (
            <div className="py-8 text-center font-mono text-xs text-cyan-300">正在读取日志...</div>
          ) : logs.length > 0 ? (
            logs.map(log => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 rounded-xl border p-4"
                style={{
                  borderColor: activeWorld.primaryColor + '28',
                  background: `linear-gradient(135deg, #0a1628, ${activeWorld.primaryColor}06)`,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-200">
                      {new Date(log.endedAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-slate-500">
                      {log.npcName} · {formatCompanionDuration(log.durationMs)}
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-slate-500">
                    <div style={{ color: activeWorld.primaryColor }}>+{log.familiarityGain} 熟悉度</div>
                    <div>当前 {log.familiarityAfter}</div>
                    {log.summarySource === 'fallback' && <div className="mt-1 text-amber-300/80">兜底</div>}
                  </div>
                </div>

                {log.topics.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {log.topics.map(topic => (
                      <span
                        key={topic}
                        className="rounded-full border px-2 py-1 font-mono text-[11px]"
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

                <p className="whitespace-pre-line text-xs leading-relaxed text-slate-400">
                  {log.summary}
                </p>
              </motion.div>
            ))
          ) : (
            <div
              className="space-y-2 rounded-2xl border border-dashed p-6 text-center"
              style={{ borderColor: activeWorld.primaryColor + '20' }}
            >
              <div className="text-sm font-semibold text-slate-300">还没有陪伴日志</div>
              <p className="text-xs leading-relaxed text-slate-600">
                先和 {activeWorld.npcName} 聊一轮，离开对话后这里就会出现今天的总结。
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
