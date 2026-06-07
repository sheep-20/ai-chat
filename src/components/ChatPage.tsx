import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Send, Settings } from 'lucide-react';
import { getWorld } from '../worlds';
import { storage } from '../utils/storage';
import { streamChat } from '../utils/ai';
import { parseUnlocks, cleanForDisplay } from '../utils/unlock';
import { ChatBubble } from './ChatBubble';
import { EncyclopediaPanel } from './EncyclopediaPanel';
import { UnlockToast } from './UnlockToast';
import type { Message, KnowledgeCard } from '../types';

interface Props {
  worldId: string;
  onBack: () => void;
  onOpenSettings: () => void;
}

export function ChatPage({ worldId, onBack, onOpenSettings }: Props) {
  const world = getWorld(worldId);
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = storage.getMessages(worldId);
    if (saved.length > 0) return saved;
    // First visit: show NPC greeting
    return [{
      id: crypto.randomUUID(),
      role: 'assistant' as const,
      content: world.initialGreeting,
      timestamp: Date.now(),
    }];
  });
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(
    () => new Set(storage.getUnlocked(worldId))
  );
  const [newUnlock, setNewUnlock] = useState<KnowledgeCard | null>(null);
  const [showEncyclopedia, setShowEncyclopedia] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Persist messages
  useEffect(() => {
    storage.saveMessages(worldId, messages);
  }, [messages, worldId]);

  const triggerUnlock = useCallback((card: KnowledgeCard) => {
    if (unlockedIds.has(card.id)) return;
    storage.addUnlocked(worldId, card.id);
    setUnlockedIds(prev => new Set([...prev, card.id]));
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setNewUnlock(card);
    toastTimerRef.current = setTimeout(() => setNewUnlock(null), 4000);
  }, [unlockedIds, worldId]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: Message = {
      id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now(),
    };
    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = {
      id: assistantId, role: 'assistant', content: '', timestamp: Date.now(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages([...nextMessages, assistantMsg]);
    setInput('');
    setIsStreaming(true);
    setStreamingId(assistantId);

    const apiMessages = [
      { role: 'system', content: world.systemPrompt },
      // Send last 30 messages max for context
      ...nextMessages.slice(-30).map(m => ({ role: m.role, content: m.content })),
    ];

    let full = '';

    await streamChat(
      storage.getApiKey(),
      storage.getApiBase(),
      'deepseek-chat',
      apiMessages,
      {
        onChunk(chunk) {
          full += chunk;
          const display = cleanForDisplay(full);
          setMessages(prev =>
            prev.map(m => m.id === assistantId ? { ...m, content: display } : m)
          );
        },
        onDone(rawText) {
          const { cleaned, keys } = parseUnlocks(rawText);
          setMessages(prev =>
            prev.map(m => m.id === assistantId ? { ...m, content: cleaned } : m)
          );
          for (const key of keys) {
            const card = world.knowledgeCards.find(c => c.unlockKey === key);
            if (card) triggerUnlock(card);
          }
          setIsStreaming(false);
          setStreamingId(null);
        },
        onError(err) {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: `⚠️ ${err.message}` }
                : m
            )
          );
          setIsStreaming(false);
          setStreamingId(null);
        },
      }
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: '#020509' }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: 'rgba(6,13,26,0.95)',
          borderColor: world.primaryColor + '25',
          backdropFilter: 'blur(12px)',
          boxShadow: `0 1px 0 ${world.primaryColor}15`,
        }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200
                     transition-colors text-sm font-mono group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          返回
        </button>

        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm border"
            style={{
              color: world.primaryColor,
              borderColor: world.primaryColor + '60',
              background: world.primaryColor + '10',
              boxShadow: `0 0 10px ${world.glowColor}`,
            }}
          >
            {world.npcAvatar}
          </div>
          <div>
            <div className="text-slate-200 text-sm font-semibold">{world.npcName}</div>
            <div className="text-slate-500 text-xs font-mono">{world.era}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEncyclopedia(!showEncyclopedia)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono
                       border transition-all duration-200 hover:scale-105"
            style={{
              color: world.primaryColor,
              borderColor: world.primaryColor + '40',
              background: world.primaryColor + '0d',
            }}
          >
            <BookOpen size={13} />
            图鉴 {unlockedIds.size}/{world.knowledgeCards.length}
          </button>
          <button
            onClick={onOpenSettings}
            className="w-8 h-8 rounded-lg flex items-center justify-center
                       text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
            title="API 设置"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 custom-scroll">
        {messages.map(msg => (
          <ChatBubble
            key={msg.id}
            message={msg}
            world={world}
            isStreaming={isStreaming && msg.id === streamingId}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="flex-shrink-0 border-t px-4 py-4"
        style={{
          background: 'rgba(6,13,26,0.95)',
          borderColor: world.primaryColor + '20',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`和 ${world.npcName} 说点什么…`}
            rows={1}
            disabled={isStreaming}
            className="flex-1 bg-space-800 border rounded-xl px-4 py-3 text-slate-200
                       text-sm resize-none focus:outline-none transition-all duration-200
                       placeholder:text-slate-600 disabled:opacity-50
                       max-h-32 overflow-y-auto custom-scroll"
            style={{
              borderColor: input ? world.primaryColor + '50' : '#1e293b',
              boxShadow: input ? `0 0 10px ${world.glowColor}` : 'none',
            }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 128) + 'px';
            }}
          />
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center
                       border transition-all duration-200 disabled:opacity-30"
            style={{
              color: world.primaryColor,
              borderColor: world.primaryColor + '50',
              background: world.primaryColor + '10',
              boxShadow: input.trim() && !isStreaming ? `0 0 16px ${world.glowColor}` : 'none',
            }}
          >
            <Send size={16} />
          </motion.button>
        </div>
        <p className="text-center text-slate-700 text-xs font-mono mt-2">
          Enter 发送 · Shift+Enter 换行
        </p>
      </div>

      {/* Encyclopedia Panel */}
      {showEncyclopedia && (
        <EncyclopediaPanel
          world={world}
          unlockedIds={unlockedIds}
          onClose={() => setShowEncyclopedia(false)}
        />
      )}

      {/* Backdrop for encyclopedia */}
      {showEncyclopedia && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowEncyclopedia(false)}
        />
      )}

      {/* Unlock Toast */}
      <UnlockToast card={newUnlock} world={world} />
    </div>
  );
}
