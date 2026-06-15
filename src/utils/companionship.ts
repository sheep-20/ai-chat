import type { CardRarity, KnowledgeCard, Message } from '../types';

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

const LOW_INFORMATION_INPUTS = new Set([
  '嗯',
  '好',
  '好的',
  '继续',
  '哈哈',
  '在吗',
  '你好',
  '哦',
  '行',
  '可以',
  '知道了',
]);

const INTENT_PATTERNS = [
  '？',
  '?',
  '为什么',
  '怎么',
  '讲讲',
  '说说',
  '发生了什么',
  '后来',
  '故事',
  '背景',
  '世界',
  '你是谁',
  '你以前',
  '你的过去',
  '你当时',
];

const QUALITY_PATTERNS = [
  '我觉得',
  '我感觉',
  '我想',
  '我认为',
  '如果',
  '但是',
  '因为',
  '所以',
  '其实',
  '孤独',
  '害怕',
  '喜欢',
  '难过',
  '好奇',
  '后悔',
  '选择',
  '关系',
  '陪',
  '理解',
];

const PERSONAL_PATTERNS = [
  '我最近',
  '我今天',
  '我以前',
  '我小时候',
  '我也',
  '我会',
  '我不想',
  '我希望',
  '我害怕',
  '我喜欢',
  '我难过',
  '我感觉',
  '我觉得',
  '现实',
  '生活',
];

const PAST_PATTERNS = [
  '你当时',
  '你以前',
  '你的过去',
  '后来发生',
  '你后悔',
  '为什么这么选',
  '那时候',
  '发生了什么',
  '林澈',
  '少年',
  '母鲸',
  '真名',
];

const RARITY_BONUS: Record<CardRarity, number> = {
  common: 1,
  rare: 2,
  legendary: 3,
};

function compactText(text: string): string {
  return text
    .replace(/\s+/g, '')
    .replace(/[，。！？、；：“”‘’《》（）【】[\]{}()<>#*`'"“”‘’]/g, '')
    .trim();
}

function hasAny(text: string, patterns: string[]): boolean {
  return patterns.some(pattern => text.includes(pattern));
}

function similarity(a: string, b: string): number {
  const left = new Set([...compactText(a)]);
  const right = new Set([...compactText(b)]);
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const char of left) {
    if (right.has(char)) overlap += 1;
  }
  return overlap / Math.max(left.size, right.size);
}

export function calculateExchangeFamiliarityGain(params: {
  text: string;
  recentUserMessages: Message[];
  newlyUnlockedCards: KnowledgeCard[];
  bondCompleted: boolean;
}): {
  delta: number;
  conversationDelta: number;
  unlockBonus: number;
  bondBonus: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  const unlockBonus = params.newlyUnlockedCards.reduce(
    (sum, card) => sum + RARITY_BONUS[card.rarity],
    0,
  );
  if (unlockBonus > 0) reasons.push(`图鉴解锁 +${unlockBonus}`);

  const bondBonus = params.bondCompleted ? 5 : 0;
  if (bondBonus > 0) reasons.push('羁绊事件完成 +5');

  if (unlockBonus > 0 || bondBonus > 0) {
    return {
      delta: unlockBonus + bondBonus,
      conversationDelta: 0,
      unlockBonus,
      bondBonus,
      reasons,
    };
  }

  const compact = compactText(params.text);
  const hasIntent = hasAny(params.text, INTENT_PATTERNS);
  const lowInformation = (compact.length < 6 && !hasIntent) || LOW_INFORMATION_INPUTS.has(compact);
  const repeated = params.recentUserMessages
    .slice(-3)
    .some(message => similarity(message.content, params.text) >= 0.86);

  let conversationDelta = 0;
  if (!lowInformation && !repeated) {
    const hasQualitySignal = hasAny(params.text, QUALITY_PATTERNS);
    const hasPersonalSignal = hasAny(params.text, PERSONAL_PATTERNS);
    const hasPastSignal = hasAny(params.text, PAST_PATTERNS);
    const meaningful = hasIntent || compact.length >= 10 || hasQualitySignal || hasPersonalSignal || hasPastSignal;
    const highQuality =
      compact.length >= 24 ||
      (compact.length >= 16 && (hasQualitySignal || hasPersonalSignal || hasPastSignal)) ||
      [hasQualitySignal, hasPersonalSignal, hasPastSignal].filter(Boolean).length >= 2;

    if (highQuality) {
      conversationDelta = 2;
      reasons.push('高质量对话');
    } else if (meaningful) {
      conversationDelta = 1;
      reasons.push('推进交流');
    }
  }

  conversationDelta = Math.min(conversationDelta, 2);

  return {
    delta: conversationDelta + unlockBonus + bondBonus,
    conversationDelta,
    unlockBonus,
    bondBonus,
    reasons,
  };
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
