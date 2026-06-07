// ================================================================
//  🌟 世界二 · 知识卡片  —— 由成员二填写
//
//  参考 world1/knowledge.ts 的格式，添加 8~10 张卡片。
//  每张卡片对应一段世界观知识，玩家与 NPC 聊到对应话题时解锁。
//
//  字段说明：
//    id        — 唯一 ID，小写加下划线
//    unlockKey — 与 systemPrompt 中 [UNLOCK:xxx] 对应，通常与 id 相同
//    title     — 卡片标题（中文）
//    subtitle  — 副标题，如年代、稀有度提示
//    icon      — emoji 图标
//    rarity    — 'common' | 'rare' | 'legendary'
//    content   — 卡片正文（2~4句话的世界观描述）
// ================================================================

import type { KnowledgeCard } from '../../types';

export const world2Cards: KnowledgeCard[] = [
  // 👇 在此替换 / 添加你的知识卡片
  {
    id: 'w2_placeholder',
    unlockKey: 'w2_placeholder',
    title: '（示例卡片）',
    subtitle: '成员二填写 · 普通',
    icon: '📖',
    rarity: 'common',
    content: '这是世界二的示例卡片，请成员二替换为真实的世界观内容。',
  },
];
