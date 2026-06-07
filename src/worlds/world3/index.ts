// ================================================================
//  🌟 世界三  —— 由成员三填写
//  填写步骤与 world2/index.ts 相同，参考注释完成配置。
// ================================================================

import type { WorldConfig } from '../../types';
import { world3Cards } from './knowledge';

export const world3: WorldConfig = {
  id: 'world3',
  name: '时间起源',        // TODO: 改为你的世界名称
  era: 'Year 0',           // TODO: 改为你的时代背景
  tagline: '待更新',
  description: '待更新',
  npcName: '（待定）',
  npcTitle: '（待定）',
  npcAvatar: '◉',
  primaryColor: '#f59e0b',
  glowColor: 'rgba(245,158,11,0.35)',
  systemPrompt: '你是...（成员三在此写 NPC 的完整 system prompt）',
  initialGreeting: '（成员三填写：NPC 的初次见面开场白）',
  knowledgeCards: world3Cards,
  available: false,
  comingSoon: '成员三正在构建这个时间坐标，敬请期待…',
};
