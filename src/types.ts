export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
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

export interface WorldConfig {
  id: string;
  name: string;
  era: string;
  tagline: string;
  description: string;
  npcName: string;
  npcTitle: string;
  npcAvatar: string;
  primaryColor: string;
  glowColor: string;
  systemPrompt: string;
  initialGreeting: string;
  knowledgeCards: KnowledgeCard[];
  available: boolean;
  comingSoon?: string;
}

export type AppPage =
  | { type: 'home' }
  | { type: 'chat'; worldId: string }
  | { type: 'setup' };
