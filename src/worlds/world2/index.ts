// ================================================================
//  🌟 世界二  —— 由成员二填写
//
//  填写步骤：
//  1. 修改下方所有带 "TODO" 注释的字段
//  2. 在 world2/knowledge.ts 添加你的知识卡片
//  3. 将 available 改为 true，世界二就会在主界面解锁
//
//  systemPrompt 写法参考 world1/index.ts，
//  把 [UNLOCK:xxx] 的 key 与 knowledge.ts 中的 unlockKey 对应。
// ================================================================

import type { WorldConfig } from '../../types';
import { world2Cards } from './knowledge';

export const world2: WorldConfig = {
  id: 'world2',
  name: '星际联邦',        // TODO: 改为你的世界名称
  era: '3201年',           // TODO: 改为你的时代背景
  tagline: '待更新',       // TODO: 一句话 slogan
  description: '待更新',   // TODO: 2~3句世界简介
  npcName: '（待定）',     // TODO: NPC 中文名
  npcTitle: '（待定）',    // TODO: NPC 头衔/身份
  npcAvatar: '◇',          // TODO: 改为合适的 emoji 或符号
  primaryColor: '#a855f7', // TODO: 主题色（hex）
  glowColor: 'rgba(168,85,247,0.35)',
  systemPrompt: '你是...（成员二在此写 NPC 的完整 system prompt）',
  initialGreeting: '（成员二填写：NPC 的初次见面开场白）',
  knowledgeCards: world2Cards,
  available: false,        // ← 改为 true 即可开放此世界
  comingSoon: '成员二正在构建这个时间坐标，敬请期待…',
};
