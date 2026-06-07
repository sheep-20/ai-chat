// ================================================================
//  世界注册表
//  添加新世界时：import 并追加到 WORLDS 数组即可，无需改其他地方。
// ================================================================

import { world1 } from './world1';
import { world2 } from './world2';
import { world3 } from './world3';
import type { WorldConfig } from '../types';

export const WORLDS: WorldConfig[] = [world1, world2, world3];

export function getWorld(id: string): WorldConfig {
  const w = WORLDS.find((w) => w.id === id);
  if (!w) throw new Error(`World "${id}" not found`);
  return w;
}
