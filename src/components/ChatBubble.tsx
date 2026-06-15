import type { Message, WorldConfig } from '../types';

interface Props {
  message: Message;
  world: WorldConfig;
  isStreaming?: boolean;
}

export function ChatBubble({ message, world, isStreaming }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-end gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-slide-up`}>
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border text-sm"
        style={isUser
          ? {
              color: '#dbeafe',
              borderColor: 'rgba(148,163,184,0.35)',
              background: 'linear-gradient(135deg, rgba(51,65,85,0.85), rgba(15,23,42,0.9))',
            }
          : {
              color: world.primaryColor,
              borderColor: world.primaryColor + '66',
              background: `radial-gradient(circle at 40% 35%, ${world.primaryColor}24, rgba(10,22,40,0.95))`,
              boxShadow: `0 0 18px ${world.glowColor}`,
            }}
      >
        {isUser ? '你' : world.npcIcon}
      </div>

      <div className={`max-w-[min(74%,760px)] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
        <div className={`font-mono text-[11px] ${isUser ? 'text-slate-600' : 'text-slate-500'}`}>
          {isUser ? '访客' : `${world.npcName} · ${world.era}`}
        </div>
        <div
          className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-7 shadow-2xl ${
            isUser ? 'rounded-br-md' : 'rounded-bl-md'
          }`}
          style={isUser
            ? {
                background: 'linear-gradient(135deg, rgba(30,41,59,0.96), rgba(15,23,42,0.96))',
                border: '1px solid rgba(148,163,184,0.18)',
                color: '#dbe4f0',
              }
            : {
                background: `linear-gradient(135deg, rgba(10,22,40,0.96), ${world.primaryColor}10)`,
                border: `1px solid ${world.primaryColor}30`,
                color: '#e2e8f0',
                boxShadow: `0 12px 34px rgba(0,0,0,0.28), 0 0 22px ${world.glowColor}`,
              }}
        >
          {message.content || (
            <span className="opacity-50">
              {isStreaming ? '正在回应...' : '...'}
            </span>
          )}
          {isStreaming && message.content && (
            <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-current align-middle" />
          )}
        </div>
      </div>
    </div>
  );
}
