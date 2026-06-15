import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, BookOpen, HeartPulse, Send, Settings, Sparkles, UserRound } from 'lucide-react';
import { getWorld } from '../worlds';
import { WORLD_SERIES } from '../worlds/series';
import { storage } from '../utils/storage';
import { streamChat } from '../utils/ai';
import { parseUnlocks, cleanForDisplay } from '../utils/unlock';
import { buildCompanionSummary, calculateFamiliarityGain, extractCompanionTopics, getFamiliarityLabel } from '../utils/companionship';
import { ChatBubble } from './ChatBubble';
import { EncyclopediaPanel } from './EncyclopediaPanel';
import { UnlockToast } from './UnlockToast';
import type { EmotionState, KnowledgeCard, Message, UserProfile, WorldConfig } from '../types';

interface Props {
  worldId: string;
  onBack: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
}

const MOOD_LABEL: Record<EmotionState['mood'], string> = {
  sad: '低落',
  anxious: '焦虑',
  angry: '愤怒',
  tired: '疲惫',
  lonely: '孤独',
  happy: '开心',
  calm: '平静',
  confused: '困惑',
  crisis: '危机风险',
  unknown: '未知',
};

function isLegacyErrorMessage(message: Message) {
  return message.role === 'assistant' && (
    message.content.includes('Unexpected token') ||
    message.content.includes('DOCTYPE') ||
    message.content.includes('本地档案库读取失败') ||
    message.content.includes('Local API returned HTML')
  );
}

function getChatTheme(world: WorldConfig) {
  const base = {
    shell: '#020509',
    panel: 'rgba(6,13,26,0.86)',
    line: world.primaryColor + '24',
    ambient: world.glowColor,
    accent: world.primaryColor,
    motif: 'linear-gradient(rgba(6,182,212,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.035) 1px, transparent 1px)',
    motifSize: '58px 58px',
  };

  if (world.seriesId === 'creation_myths') {
    return {
      ...base,
      motif: 'radial-gradient(circle at center, rgba(245,158,11,0.12) 0 1px, transparent 2px), radial-gradient(circle at center, transparent 0 42%, rgba(245,158,11,0.08) 43%, transparent 45%)',
      motifSize: '42px 42px, 220px 220px',
    };
  }

  if (world.seriesId === 'classic_archives') {
    return {
      ...base,
      panel: 'rgba(10,9,22,0.86)',
      motif: 'linear-gradient(115deg, rgba(192,132,252,0.06), transparent 34%), linear-gradient(rgba(192,132,252,0.026) 1px, transparent 1px)',
      motifSize: 'auto, 54px 54px',
    };
  }

  if (world.seriesId === 'imagined_lives') {
    return {
      ...base,
      panel: 'rgba(5,17,31,0.88)',
      motif: 'radial-gradient(ellipse at 50% 20%, rgba(56,189,248,0.12), transparent 35%), repeating-linear-gradient(0deg, rgba(56,189,248,0.035) 0 1px, transparent 1px 18px)',
      motifSize: 'auto, 100% 36px',
    };
  }

  return base;
}

export function ChatPage({ worldId, onBack, onOpenSettings, onOpenProfile }: Props) {
  const world = getWorld(worldId);
  const theme = useMemo(() => getChatTheme(world), [world]);
  const series = WORLD_SERIES.find(item => item.id === world.seriesId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loadWarning, setLoadWarning] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [familiarity, setFamiliarity] = useState(0);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [emotionHistory, setEmotionHistory] = useState<EmotionState[]>([]);
  const [newUnlock, setNewUnlock] = useState<KnowledgeCard | null>(null);
  const [showEncyclopedia, setShowEncyclopedia] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStartRef = useRef(Date.now());
  const sessionUnlockedRef = useRef(new Set<string>());
  const sessionFinalizedRef = useRef(false);
  const loadedRef = useRef(false);
  const apiAvailableRef = useRef(true);

  const latestEmotion: EmotionState | undefined = emotionHistory.length > 0
    ? emotionHistory[emotionHistory.length - 1]
    : undefined;
  const unlockedCount = unlockedIds.size;

  useEffect(() => {
    let alive = true;
    async function load() {
      setIsLoading(true);
      const initialMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: world.initialGreeting,
        timestamp: Date.now(),
      };

      const results = await Promise.allSettled([
        storage.getMessages(worldId),
        storage.getUnlocked(worldId),
        storage.getFamiliarity(worldId),
        storage.getProfileState(),
        storage.getEmotionHistory(worldId),
      ]);
      if (!alive) return;

      const failed = results.find(result => result.status === 'rejected') as PromiseRejectedResult | undefined;
      if (failed) {
        apiAvailableRef.current = false;
        setLoadWarning(failed.reason instanceof Error ? failed.reason.message : String(failed.reason));
      } else {
        apiAvailableRef.current = true;
        setLoadWarning('');
      }

      const savedMessages = results[0].status === 'fulfilled'
        ? results[0].value.filter(message => !isLegacyErrorMessage(message))
        : [];
      const savedUnlocked = results[1].status === 'fulfilled' ? results[1].value : [];
      const savedFamiliarity = results[2].status === 'fulfilled' ? results[2].value : 0;
      const profileState = results[3].status === 'fulfilled' ? results[3].value : { profile: null };
      const savedEmotions = results[4].status === 'fulfilled' ? results[4].value : [];

      setMessages(savedMessages.length > 0 ? savedMessages : [initialMessage]);
      setUnlockedIds(new Set(savedUnlocked));
      setFamiliarity(savedFamiliarity);
      setProfile(profileState.profile);
      setEmotionHistory(savedEmotions);
      loadedRef.current = true;
      setIsLoading(false);
    }
    load().catch(err => {
      setLoadWarning(err instanceof Error ? err.message : String(err));
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: world.initialGreeting,
        timestamp: Date.now(),
      }]);
      setIsLoading(false);
    });
    return () => { alive = false; };
  }, [world, worldId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!loadedRef.current || !apiAvailableRef.current) return;
    void storage.saveMessages(worldId, messages).catch(() => {});
  }, [messages, worldId]);

  const triggerUnlock = useCallback(async (card: KnowledgeCard) => {
    if (unlockedIds.has(card.id)) return;
    sessionUnlockedRef.current.add(card.id);
    if (apiAvailableRef.current) {
      const next = await storage.addUnlocked(worldId, card.id);
      setUnlockedIds(new Set(next));
    } else {
      setUnlockedIds(prev => new Set([...prev, card.id]));
    }
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setNewUnlock(card);
    toastTimerRef.current = setTimeout(() => setNewUnlock(null), 4000);
  }, [unlockedIds, worldId]);

  function buildPersonalizationPrompt(emotion: EmotionState | null) {
    const profileLines = profile ? [
      '【用户资料与互动契约】',
      `- 称呼：${profile.displayName || '回声旅人'}`,
      profile.personality ? `- 用户自设性格/相处气质：${profile.personality}` : '',
      profile.preferredWorld ? `- 偏好的世界/题材：${profile.preferredWorld}` : '',
      profile.interactionStyle ? `- 喜欢的互动方式：${profile.interactionStyle}` : '',
      profile.emotionalSupport ? `- 情绪低落时偏好的陪伴方式：${profile.emotionalSupport}` : '',
      profile.boundaries ? `- 剧情边界与雷区：${profile.boundaries}` : '',
      profile.memoryNotes ? `- 长期偏好备注：${profile.memoryNotes}` : '',
    ].filter(Boolean).join('\n') : '';

    const recentTrend = emotionHistory.slice(-4).map(item => `${MOOD_LABEL[item.mood]}(${item.intensity}/5)`).join(' -> ');
    const emotionLines = emotion ? [
      '【当前情绪支持上下文】',
      `- 当前倾向：${MOOD_LABEL[emotion.mood]}，强度 ${emotion.intensity}/5，置信度 ${Math.round(emotion.confidence * 100)}%。`,
      emotion.signals.length ? `- 线索：${emotion.signals.join('、')}` : '',
      `- 回复策略：${emotion.supportStrategy}`,
      recentTrend ? `- 最近趋势：${recentTrend}` : '',
      '- 不要直接说“我检测到你的情绪”，要把判断自然融入语气、节奏和回应方式。',
      '- 回复目标是支持、陪伴、稳定和恢复行动感，不做医疗诊断，不操控用户情绪。',
      emotion.mood === 'crisis'
        ? '- 如果出现自伤、自杀或现实危险倾向，暂停剧情推进，优先安全支持：温和建议联系可信任的人、当地紧急服务或危机热线。'
        : '',
    ].filter(Boolean).join('\n') : '';

    return [profileLines, emotionLines, [
      '【回复优先级】',
      '1. 安全边界和危机处理。',
      '2. 用户资料里的雷区和陪伴偏好。',
      '3. 当前情绪策略。',
      '4. 世界角色设定和剧情风格。',
    ].join('\n')].filter(Boolean).join('\n\n');
  }

  function buildRagPrompt(chunks: Awaited<ReturnType<typeof storage.searchRag>>) {
    if (!chunks.length) {
      return [
        '【旧文明残卷检索】',
        '本轮没有检索到足够相关的《聊斋》残卷摘录。',
        '如果用户询问具体篇章或原文细节，请以青灯的语气说明“这页残卷尚未修复”，不要编造具体原文情节。',
      ].join('\n');
    }

    const excerpts = chunks.map((chunk, index) => [
      `片段${index + 1}｜来源：《聊斋志异》· ${chunk.storyTitle}｜${chunk.sourceName}｜第 ${chunk.chunkIndex + 1} 段`,
      chunk.content,
    ].join('\n')).join('\n\n');

    return [
      '【旧文明残卷摘录】',
      excerpts,
      '',
      '请结合以上摘录回答。若摘录不足，不要编造具体原文；可以用青灯的语气转述、解释或延展，但不要大段照抄原文。',
    ].join('\n');
  }

  async function generateJournalSummary(params: {
    topics: string[];
    durationMs: number;
    familiarityGain: number;
    familiarityAfter: number;
    unlockCount: number;
  }): Promise<{ summary: string; source: 'ai' | 'fallback' }> {
    const fallback = buildCompanionSummary(params);
    const recentMessages = messages.slice(-16).map(message => `${message.role === 'user' ? '用户' : world.npcName}：${message.content}`).join('\n');
    const recentEmotions = emotionHistory.slice(-6).map(item => `${MOOD_LABEL[item.mood]}(${item.intensity}/5)`).join(' -> ');
    const prompt = [
      '请为一次陪伴式角色对话写一段新的中文陪伴日志总结。',
      '要求：不要使用固定模板；结合真实聊天内容；语气温柔、有陪伴感；不要编造没有发生的剧情；120 字以内。',
      `世界：${world.name}`,
      `角色：${world.npcName}（${world.npcTitle}）`,
      `本次时长：${Math.max(1, Math.round(params.durationMs / 60000))} 分钟`,
      `熟悉度变化：+${params.familiarityGain}，当前 ${params.familiarityAfter}`,
      `解锁数量：${params.unlockCount}`,
      `关键词：${params.topics.join('、') || '无'}`,
      recentEmotions ? `情绪变化：${recentEmotions}` : '',
      '最近对话：',
      recentMessages || '本次几乎没有展开对话。',
    ].filter(Boolean).join('\n');

    try {
      if (!apiAvailableRef.current) return { summary: fallback, source: 'fallback' };
      const summary = await storage.generateCompanionSummary(worldId, [
        { role: 'system', content: '你是 TIME ECHO 的陪伴日志记录员，只输出日志正文。' },
        { role: 'user', content: prompt },
      ]);
      return { summary: summary || fallback, source: summary ? 'ai' : 'fallback' };
    } catch {
      return { summary: fallback, source: 'fallback' };
    }
  }

  const finalizeCompanionSession = useCallback(async () => {
    if (sessionFinalizedRef.current) return;
    sessionFinalizedRef.current = true;

    const durationMs = Date.now() - sessionStartRef.current;
    const unlockedCards = world.knowledgeCards.filter(card => unlockedIds.has(card.id));
    const topics = extractCompanionTopics({ messages, unlockedCards });
    const userMessageCount = messages.filter(message => message.role === 'user').length;
    const unlockCount = sessionUnlockedRef.current.size;
    const familiarityGain = calculateFamiliarityGain({ durationMs, userMessageCount, unlockCount });
    const familiarityAfter = apiAvailableRef.current
      ? await storage.addFamiliarity(worldId, familiarityGain)
      : familiarity + familiarityGain;
    setFamiliarity(familiarityAfter);

    const summaryResult = await generateJournalSummary({ topics, durationMs, familiarityGain, familiarityAfter, unlockCount });

    if (apiAvailableRef.current) {
      await storage.addCompanionLog(worldId, {
        id: crypto.randomUUID(),
        worldId,
        worldName: world.name,
        npcName: world.npcName,
        startedAt: sessionStartRef.current,
        endedAt: Date.now(),
        durationMs,
        topics,
        summary: summaryResult.summary,
        summarySource: summaryResult.source,
        familiarityGain,
        familiarityAfter,
        unlockCount,
      });
    }
  }, [emotionHistory, familiarity, messages, unlockedIds, world, worldId]);

  async function handleBack() {
    if (isLeaving) return;
    setIsLeaving(true);
    if (apiAvailableRef.current) await storage.saveMessages(worldId, messages).catch(() => {});
    await finalizeCompanionSession();
    onBack();
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || isStreaming || isLeaving) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() };
    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() };
    const nextMessages = [...messages, userMsg];

    setMessages([...nextMessages, assistantMsg]);
    setInput('');
    setIsStreaming(true);
    setStreamingId(assistantId);

    let currentEmotion: EmotionState | null = null;
    if (apiAvailableRef.current) {
      try {
        currentEmotion = await storage.analyzeEmotion({ worldId, text, recentMessages: messages.slice(-12), profile });
        const nextEmotions = await storage.saveEmotion(worldId, currentEmotion);
        setEmotionHistory(nextEmotions);
      } catch {
        currentEmotion = null;
      }
    }

    const supportPrompt = buildPersonalizationPrompt(currentEmotion);
    let ragPrompt = '';
    if (worldId === 'world2' && apiAvailableRef.current) {
      try {
        const ragChunks = await storage.searchRag(worldId, text, 5);
        ragPrompt = buildRagPrompt(ragChunks);
      } catch {
        ragPrompt = '';
      }
    }
    const systemPrompt = [world.systemPrompt, ragPrompt, supportPrompt].filter(Boolean).join('\n\n');
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...nextMessages.slice(-30).map(m => ({ role: m.role, content: m.content })),
    ];

    let full = '';
    await streamChat('deepseek-chat', apiMessages, {
      onChunk(chunk) {
        full += chunk;
        const display = cleanForDisplay(full);
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: display } : m));
      },
      async onDone(rawText) {
        const { cleaned, keys } = parseUnlocks(rawText);
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: cleaned } : m));
        for (const key of keys) {
          const card = world.knowledgeCards.find(c => c.unlockKey === key);
          if (card) await triggerUnlock(card);
        }
        setIsStreaming(false);
        setStreamingId(null);
      },
      onError(err) {
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `请求失败：${err.message}` } : m));
        setIsStreaming(false);
        setStreamingId(null);
      },
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  return (
    <div
      className="relative flex h-screen flex-col overflow-hidden"
      style={{ background: theme.shell }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            `radial-gradient(circle at 50% -10%, ${world.primaryColor}22, transparent 34%), radial-gradient(circle at 14% 24%, ${world.primaryColor}12, transparent 24%), ${theme.motif}`,
          backgroundSize: `auto, auto, ${theme.motifSize}`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,5,9,0.14),rgba(2,5,9,0.78))]" />

      <header
        className="relative z-10 flex h-[76px] flex-shrink-0 items-center justify-between border-b px-5"
        style={{
          background: 'rgba(6,13,26,0.78)',
          borderColor: theme.line,
          backdropFilter: 'blur(18px)',
        }}
      >
        <button
          onClick={handleBack}
          disabled={isLeaving}
          className="group flex items-center gap-2 font-mono text-sm text-slate-400 transition-colors hover:text-slate-100 disabled:cursor-wait disabled:opacity-60"
        >
          <ArrowLeft size={17} className="transition-transform group-hover:-translate-x-0.5" />
          {isLeaving ? '记录中...' : '返回'}
        </button>

        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full border font-orbitron text-sm"
            style={{
              color: world.primaryColor,
              borderColor: world.primaryColor + '65',
              background: `radial-gradient(circle, ${world.primaryColor}20, rgba(10,22,40,0.95))`,
              boxShadow: `0 0 22px ${world.glowColor}`,
            }}
          >
            {world.npcIcon}
          </div>
          <div>
            <div className="text-base font-semibold text-slate-100">{world.npcName}</div>
            <div className="font-mono text-xs text-slate-500">{world.era}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEncyclopedia(!showEncyclopedia)}
            className="hidden items-center gap-2 rounded-lg border px-3 py-2 font-mono text-xs transition-all duration-200 hover:scale-[1.02] sm:flex"
            style={{
              color: world.primaryColor,
              borderColor: world.primaryColor + '40',
              background: world.primaryColor + '0d',
            }}
          >
            <BookOpen size={15} />
            图鉴 {unlockedCount}/{world.knowledgeCards.length}
          </button>
          <IconButton title="用户资料" onClick={onOpenProfile}><UserRound size={16} /></IconButton>
          <IconButton title="API 设置" onClick={onOpenSettings}><Settings size={16} /></IconButton>
        </div>
      </header>

      <main className="relative z-10 grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[260px_1fr_260px]">
        <aside className="hidden border-r p-5 xl:block" style={{ borderColor: theme.line, background: 'rgba(6,13,26,0.36)' }}>
          <PanelTitle label="WORLD" />
          <div className="mt-4 rounded-xl border p-4" style={{ borderColor: theme.line, background: theme.panel }}>
            <div className="font-orbitron text-3xl" style={{ color: world.primaryColor, textShadow: `0 0 18px ${world.glowColor}` }}>{world.npcIcon}</div>
            <div className="mt-4 text-sm font-semibold text-slate-100">{world.name}</div>
            <div className="mt-1 font-mono text-xs text-slate-500">{series?.name ?? world.era}</div>
            <p className="mt-4 text-xs leading-6 text-slate-500">{world.tagline}</p>
          </div>

          <div className="mt-4 grid gap-3">
            <Metric label="熟悉度" value={`${getFamiliarityLabel(familiarity)} · ${familiarity}`} world={world} />
            <Metric label="图鉴进度" value={`${unlockedCount}/${world.knowledgeCards.length}`} world={world} />
            <Metric label="情绪轨迹" value={latestEmotion ? MOOD_LABEL[latestEmotion.mood] : '未同步'} world={world} />
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          {loadWarning && (
            <div className="mx-auto mt-5 flex w-[min(920px,calc(100%-32px))] items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/8 px-4 py-3 text-xs leading-5 text-amber-100/85">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-amber-300" />
              <div>
                <div className="font-semibold text-amber-200">本地档案库暂时不可用</div>
                <div className="mt-1 text-amber-100/65">{loadWarning}</div>
              </div>
            </div>
          )}

          <div className="custom-scroll min-h-0 flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
              {isLoading ? (
                <div className="py-16 text-center font-mono text-sm" style={{ color: world.primaryColor }}>正在读取对话档案...</div>
              ) : (
                <>
                  {messages.length <= 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mx-auto mb-2 w-full max-w-2xl border px-5 py-4 text-center"
                      style={{ borderColor: theme.line, background: theme.panel }}
                    >
                      <div className="font-mono text-xs tracking-[0.35em]" style={{ color: world.primaryColor }}>TIME ECHO LINK</div>
                      <div className="mt-2 text-sm text-slate-400">信道稳定。你可以从一句问候、一个情绪、或一个想进入的剧情开始。</div>
                    </motion.div>
                  )}
                  {messages.map(msg => (
                    <ChatBubble key={msg.id} message={msg} world={world} isStreaming={isStreaming && msg.id === streamingId} />
                  ))}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t px-4 py-4" style={{ borderColor: theme.line, background: 'rgba(6,13,26,0.82)', backdropFilter: 'blur(18px)' }}>
            <div className="mx-auto grid max-w-4xl grid-cols-[minmax(0,1fr)_56px] items-stretch gap-3">
              <div className="relative min-h-[56px]">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`和 ${world.npcName} 说点什么...`}
                  rows={1}
                  disabled={isStreaming || isLeaving || isLoading}
                  className="custom-scroll block h-14 max-h-32 min-h-[56px] w-full resize-none overflow-y-auto rounded-xl border bg-space-800/90 px-4 py-[17px] pr-12 text-sm leading-5 text-slate-200 transition-all duration-200 placeholder:text-slate-600 focus:outline-none disabled:opacity-50"
                  style={{
                    borderColor: input ? world.primaryColor + '55' : '#1e293b',
                    boxShadow: input ? `0 0 18px ${world.glowColor}` : 'none',
                  }}
                  onInput={e => {
                    const t = e.currentTarget;
                    t.style.height = 'auto';
                    t.style.height = `${Math.max(56, Math.min(t.scrollHeight, 128))}px`;
                  }}
                />
                <Sparkles size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" />
              </div>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={sendMessage}
                disabled={!input.trim() || isStreaming || isLeaving || isLoading}
                className="flex h-14 w-14 items-center justify-center rounded-xl border transition-all duration-200 disabled:opacity-30"
                style={{
                  color: world.primaryColor,
                  borderColor: world.primaryColor + '55',
                  background: world.primaryColor + '12',
                  boxShadow: input.trim() && !isStreaming ? `0 0 18px ${world.glowColor}` : 'none',
                }}
              >
                <Send size={18} />
              </motion.button>
            </div>
            <p className="mt-2 text-center font-mono text-xs text-slate-700">Enter 发送 · Shift+Enter 换行</p>
          </div>
        </section>

        <aside className="hidden border-l p-5 xl:block" style={{ borderColor: theme.line, background: 'rgba(6,13,26,0.32)' }}>
          <PanelTitle label="COMPANION" />
          <div className="mt-4 space-y-3 rounded-xl border p-4" style={{ borderColor: theme.line, background: theme.panel }}>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <HeartPulse size={16} style={{ color: world.primaryColor }} />
              陪伴状态
            </div>
            <p className="text-xs leading-6 text-slate-500">
              {latestEmotion
                ? `最近情绪倾向：${MOOD_LABEL[latestEmotion.mood]}，强度 ${latestEmotion.intensity}/5。角色会把它自然融入回应。`
                : '还没有新的情绪轨迹。发送一句话后，角色会调整陪伴节奏。'}
            </p>
          </div>
          <button
            onClick={() => setShowEncyclopedia(true)}
            className="mt-4 w-full rounded-xl border px-4 py-3 text-left text-sm transition-all hover:scale-[1.01]"
            style={{ color: world.primaryColor, borderColor: theme.line, background: world.primaryColor + '0c' }}
          >
            <div className="flex items-center gap-2 font-semibold">
              <BookOpen size={16} />
              打开世界图鉴
            </div>
            <div className="mt-1 font-mono text-xs text-slate-500">{unlockedCount}/{world.knowledgeCards.length} 已解锁</div>
          </button>
        </aside>
      </main>

      {showEncyclopedia && (
        <EncyclopediaPanel world={world} unlockedIds={unlockedIds} onClose={() => setShowEncyclopedia(false)} />
      )}

      {showEncyclopedia && (
        <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm" onClick={() => setShowEncyclopedia(false)} />
      )}

      <UnlockToast card={newUnlock} world={world} />
    </div>
  );
}

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-space-700 bg-space-900/70 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
    >
      {children}
    </button>
  );
}

function PanelTitle({ label }: { label: string }) {
  return <div className="font-mono text-xs tracking-[0.35em] text-slate-600">{label}</div>;
}

function Metric({ label, value, world }: { label: string; value: string; world: WorldConfig }) {
  return (
    <div className="rounded-xl border bg-space-900/45 px-4 py-3" style={{ borderColor: world.primaryColor + '18' }}>
      <div className="font-mono text-[11px] text-slate-600">{label}</div>
      <div className="mt-1 text-sm font-semibold" style={{ color: world.primaryColor }}>{value}</div>
    </div>
  );
}
