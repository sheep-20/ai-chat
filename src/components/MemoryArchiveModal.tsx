import { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Clock3, Link2, Trash2, UserRound, X } from 'lucide-react';
import type { MemoryItem, ShortTermMemory, UserLongTermMemory, WorldBondMemory, WorldConfig } from '../types';

interface Props {
  world: WorldConfig;
  userMemory: UserLongTermMemory;
  worldMemory: WorldBondMemory;
  shortTermMemory: ShortTermMemory;
  onClose: () => void;
  onDeleteUserMemory: (itemId: string) => void;
  onDeleteWorldMemory: (itemId: string) => void;
  onClearShortTermMemory: () => void;
}

type TabId = 'user' | 'world' | 'short';

const SOURCE_LABEL: Record<string, string> = {
  profile: '资料',
  chat: '对话',
  companion_log: '日志',
  bond_event: '羁绊',
  emotion: '情绪',
  manual: '手动',
};

const IMPORTANCE_LABEL: Record<string, string> = {
  high: '重要',
  medium: '常规',
  low: '轻量',
};

function formatTime(value: number) {
  if (!value) return '未同步';
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function MemoryArchiveModal({
  world,
  userMemory,
  worldMemory,
  shortTermMemory,
  onClose,
  onDeleteUserMemory,
  onDeleteWorldMemory,
  onClearShortTermMemory,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('user');
  const tabs = [
    { id: 'user' as const, label: '用户偏好', count: userMemory.items.length, icon: UserRound },
    { id: 'world' as const, label: '世界羁绊', count: worldMemory.items.length, icon: Link2 },
    { id: 'short' as const, label: '短期上下文', count: shortTermMemory.summary || shortTermMemory.openLoops.length ? 1 : 0, icon: Clock3 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/62 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative z-10 flex max-h-[calc(100vh-96px)] w-[min(880px,calc(100vw-48px))] flex-col overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          borderColor: world.primaryColor + '45',
          background: 'rgba(6,13,26,0.96)',
          boxShadow: `0 0 36px ${world.glowColor}`,
        }}
      >
        <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b px-5 py-4" style={{ borderColor: world.primaryColor + '22' }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-base font-semibold text-slate-100">
              <Brain size={18} style={{ color: world.primaryColor }} />
              记忆档案
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {world.npcName} · 用户偏好 {userMemory.items.length} · 世界羁绊 {worldMemory.items.length}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-100"
            title="关闭"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-shrink-0 gap-2 border-b px-5 py-3" style={{ borderColor: world.primaryColor + '18' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all"
                style={{
                  color: active ? world.primaryColor : '#94a3b8',
                  borderColor: active ? world.primaryColor + '55' : 'rgba(148,163,184,0.14)',
                  background: active ? world.primaryColor + '12' : 'rgba(15,23,42,0.45)',
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                <span className="font-mono text-[10px] text-slate-500">{tab.count}</span>
              </button>
            );
          })}
        </div>

        <div className="custom-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {activeTab === 'user' && (
            <MemoryList
              emptyText="还没有长期用户偏好。明确的称呼、雷区、陪伴方式会沉淀到这里。"
              items={userMemory.items.slice(0, 12)}
              world={world}
              onDelete={onDeleteUserMemory}
            />
          )}
          {activeTab === 'world' && (
            <MemoryList
              emptyText={`还没有 ${world.npcName} 的羁绊记忆。完成羁绊事件或重要选择后会记录在这里。`}
              items={worldMemory.items.slice(0, 16)}
              world={world}
              onDelete={onDeleteWorldMemory}
            />
          )}
          {activeTab === 'short' && (
            <ShortTermView memory={shortTermMemory} world={world} onClear={onClearShortTermMemory} />
          )}
        </div>
      </motion.div>
    </div>
  );
}

function MemoryList({ items, world, emptyText, onDelete }: {
  items: MemoryItem[];
  world: WorldConfig;
  emptyText: string;
  onDelete: (itemId: string) => void;
}) {
  if (!items.length) {
    return <div className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-500">{emptyText}</div>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(item => (
        <article key={item.id} className="rounded-xl border border-white/8 bg-white/[0.035] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-100">{item.title || item.tags[0] || '记忆片段'}</div>
              <div className="mt-1 flex flex-wrap gap-2 font-mono text-[10px] text-slate-600">
                <span style={{ color: world.primaryColor }}>{SOURCE_LABEL[item.source] ?? item.source}</span>
                <span>{IMPORTANCE_LABEL[item.importance] ?? item.importance}</span>
                <span>{formatTime(item.updatedAt)}</span>
              </div>
            </div>
            <button
              type="button"
              title="删除这条记忆"
              onClick={() => onDelete(item.id)}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-white/5 hover:text-slate-200"
            >
              <Trash2 size={15} />
            </button>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">{item.text}</p>
          {item.updatedReason && <p className="mt-2 text-xs leading-5 text-slate-600">{item.updatedReason}</p>}
        </article>
      ))}
    </div>
  );
}

function ShortTermView({ memory, world, onClear }: { memory: ShortTermMemory; world: WorldConfig; onClear: () => void }) {
  const hasContent = !!memory.summary || !!memory.lastUserNeed || memory.openLoops.length > 0;
  if (!hasContent) {
    return <div className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-500">当前没有短期上下文。</div>;
  }

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.035] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-100">最近同步</div>
          <div className="mt-1 font-mono text-[10px] text-slate-600">{formatTime(memory.updatedAt)}</div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-white/5"
          style={{ color: world.primaryColor, borderColor: world.primaryColor + '35' }}
        >
          清空短期上下文
        </button>
      </div>
      {memory.summary && <p className="mt-4 text-sm leading-6 text-slate-400">{memory.summary}</p>}
      {memory.lastUserNeed && (
        <div className="mt-4 rounded-lg border border-white/6 bg-black/10 px-3 py-2 text-xs leading-5 text-slate-500">
          刚表达的需求：{memory.lastUserNeed}
        </div>
      )}
      {memory.openLoops.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {memory.openLoops.slice(0, 5).map(loop => (
            <span key={loop} className="rounded-full border px-3 py-1 text-xs text-slate-400" style={{ borderColor: world.primaryColor + '25' }}>
              {loop}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
