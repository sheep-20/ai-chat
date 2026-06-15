import type { KnowledgeCard, Message } from '../types';

export function formatCompanionDuration(durationMs: number): string {
  const totalMinutes = Math.max(1, Math.round(durationMs / 60000));
  if (totalMinutes < 60) return `${totalMinutes} 分钟`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`;
}

export function getFamiliarityLabel(value: number): string {
  if (value >= 80) return '默契';
  if (value >= 45) return '知心';
  if (value >= 24) return '亲近';
  if (value >= 10) return '熟悉';
  return '初识';
}

export function calculateFamiliarityGain(params: {
  durationMs: number;
  userMessageCount: number;
  unlockCount: number;
}): number {
  const durationBonus = Math.min(4, Math.floor(params.durationMs / (6 * 60 * 1000)));
  const talkBonus = Math.min(3, Math.max(0, params.userMessageCount - 1));
  const unlockBonus = params.unlockCount * 2;
  return Math.max(1, 1 + durationBonus + talkBonus + unlockBonus);
}

function trimSnippet(text: string): string {
  const cleaned = text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[【】[\]{}()<>#*`'"“”‘’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';
  const short = cleaned.slice(0, 14);
  return short.length < cleaned.length ? `${short}...` : short;
}

export function extractCompanionTopics(params: {
  messages: Message[];
  unlockedCards: KnowledgeCard[];
}): string[] {
  const topics: string[] = [];

  for (const card of params.unlockedCards.slice(-3)) {
    if (!topics.includes(card.title)) topics.push(card.title);
  }

  for (const message of params.messages.filter(m => m.role === 'user').slice(-3)) {
    const snippet = trimSnippet(message.content);
    if (snippet && !topics.includes(snippet)) topics.push(snippet);
  }

  return topics.slice(0, 3);
}

export function buildCompanionSummary(params: {
  topics: string[];
  durationMs: number;
  familiarityGain: number;
  familiarityAfter: number;
  unlockCount: number;
}): string {
  const topicLine = params.topics.length > 0
    ? `这次主要聊到了 ${params.topics.join('、')}。`
    : '这次更像一次短暂的同步，话题还没有完全展开。';
  const unlockLine = params.unlockCount > 0
    ? `途中有 ${params.unlockCount} 个新的名词被记录进档案。`
    : '这次没有新的图鉴解锁，但彼此的声音又熟悉了一点。';

  return [
    topicLine,
    `你们相处了 ${formatCompanionDuration(params.durationMs)}，熟悉度 +${params.familiarityGain}，当前为 ${params.familiarityAfter}。`,
    unlockLine,
    '等下次再见时，可以从这段没有说完的回声继续。'
  ].join('\n');
}
