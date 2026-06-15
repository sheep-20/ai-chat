export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface CompanionLog {
  id: string;
  worldId: string;
  worldName: string;
  npcName: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  topics: string[];
  summary: string;
  summarySource?: 'ai' | 'fallback';
  familiarityGain: number;
  familiarityAfter: number;
  unlockCount: number;
}

export interface FamiliarityState {
  worldId: string;
  points: number;
  updatedAt: number;
}

export interface UserProfile {
  displayName: string;
  personality: string;
  preferredWorld: string;
  interactionStyle: string;
  emotionalSupport: string;
  boundaries: string;
  memoryNotes: string;
  updatedAt: number;
}

export type EmotionMood =
  | 'sad'
  | 'anxious'
  | 'angry'
  | 'tired'
  | 'lonely'
  | 'happy'
  | 'calm'
  | 'confused'
  | 'crisis'
  | 'unknown';

export interface EmotionState {
  mood: EmotionMood;
  intensity: number;
  confidence: number;
  signals: string[];
  supportStrategy: string;
  createdAt: number;
  source?: 'ai' | 'heuristic' | 'fallback';
}

export type MemoryScope = 'user' | 'world' | 'short';
export type MemoryImportance = 'low' | 'medium' | 'high';
export type MemorySource = 'profile' | 'chat' | 'companion_log' | 'bond_event' | 'emotion' | 'manual';

export interface MemoryItem {
  id: string;
  key: string;
  scope: MemoryScope;
  title?: string;
  text: string;
  tags: string[];
  source: MemorySource;
  importance: MemoryImportance;
  confidence: number;
  updatedReason?: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserLongTermMemory {
  items: MemoryItem[];
}

export interface BondEventMemoryNote {
  eventId: string;
  title: string;
  choiceText?: string;
  completedAt: number;
}

export interface WorldBondMemory {
  worldId: string;
  items: MemoryItem[];
  completedBondEventNotes: BondEventMemoryNote[];
  lastImportantMoment: string;
}

export interface ShortTermMemory {
  worldId: string;
  summary: string;
  openLoops: string[];
  lastUserNeed: string;
  updatedAt: number;
}

export interface MemoryExtractResult {
  userMemory: UserLongTermMemory;
  worldMemory: WorldBondMemory;
  shortTermMemory: ShortTermMemory;
}

export type CardRarity = 'common' | 'rare' | 'legendary';

export interface KnowledgeCard {
  id: string;
  unlockKey: string;
  title: string;
  subtitle: string;
  content: string;
  rarity: CardRarity;
  icon: string;
}

export interface BondChoice {
  label: string;
  userText: string;
}

export interface BondEvent {
  id: string;
  title: string;
  threshold: number;
  summary: string;
  triggerLabel: string;
  opening: string;
  choices: BondChoice[];
}

export interface WorldConfig {
  id: string;
  seriesId: string;
  order: number;
  name: string;
  era: string;
  tagline: string;
  description: string;
  npcName: string;
  npcTitle: string;
  npcAvatar: string;
  npcIcon: string;
  primaryColor: string;
  glowColor: string;
  systemPrompt: string;
  initialGreeting: string;
  knowledgeCards: KnowledgeCard[];
  bondEvents?: BondEvent[];
  available: boolean;
  comingSoon?: string;
  statusLabel?: string;
}

export interface WorldSeries {
  id: string;
  name: string;
  description: string;
  themeColor: string;
  order: number;
}

export interface RagChunk {
  id: string;
  worldId: string;
  storyTitle: string;
  chunkIndex: number;
  sourceName: string;
  content: string;
}

export type AppPage =
  | { type: 'home' }
  | { type: 'chat'; worldId: string }
  | { type: 'setup' };
