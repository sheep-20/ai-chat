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
      {/* Avatar */}
      {!isUser && (
        <div
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base border"
          style={{
            color: world.primaryColor,
            borderColor: world.primaryColor + '60',
            background: world.primaryColor + '10',
            boxShadow: `0 0 10px ${world.glowColor}`,
          }}
        >
          {world.npcAvatar}
        </div>
      )}

      {isUser && (
        <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center
                        text-xs font-orbitron bg-slate-700 border border-slate-600 text-slate-300">
          你
        </div>
      )}

      {/* Bubble */}
      <div
        className={`max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
                    ${isUser ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
        style={
          isUser
            ? {
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
              }
            : {
                background: world.primaryColor + '0d',
                border: `1px solid ${world.primaryColor}30`,
                color: '#e2e8f0',
                boxShadow: `0 0 16px ${world.glowColor}`,
              }
        }
      >
        {message.content || (
          <span className="opacity-40">
            {isStreaming ? '▋' : '…'}
          </span>
        )}
        {isStreaming && message.content && (
          <span className="inline-block w-[2px] h-4 ml-0.5 bg-current align-middle animate-pulse" />
        )}
      </div>
    </div>
  );
}
