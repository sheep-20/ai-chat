import type { CompanionLog, Message } from '../types';

const KEY = {
  apiKey:   'te_api_key',
  apiBase:  'te_api_base',
  messages: (wid: string) => `te_messages_${wid}`,
  unlocked: (wid: string) => `te_unlocked_${wid}`,
  familiarity: (wid: string) => `te_familiarity_${wid}`,
  companionLogs: (wid: string) => `te_companion_logs_${wid}`,
};

export const storage = {
  getApiKey: (): string => localStorage.getItem(KEY.apiKey) ?? '',
  setApiKey: (v: string) => localStorage.setItem(KEY.apiKey, v),

  getApiBase: (): string =>
    localStorage.getItem(KEY.apiBase) ?? 'https://api.openai.com/v1',
  setApiBase: (v: string) => localStorage.setItem(KEY.apiBase, v),

  getMessages(worldId: string): Message[] {
    try {
      const raw = localStorage.getItem(KEY.messages(worldId));
      return raw ? (JSON.parse(raw) as Message[]) : [];
    } catch {
      return [];
    }
  },
  saveMessages(worldId: string, msgs: Message[]) {
    localStorage.setItem(KEY.messages(worldId), JSON.stringify(msgs));
  },

  getUnlocked(worldId: string): string[] {
    try {
      const raw = localStorage.getItem(KEY.unlocked(worldId));
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  },
  addUnlocked(worldId: string, cardId: string) {
    const list = this.getUnlocked(worldId);
    if (!list.includes(cardId)) {
      localStorage.setItem(KEY.unlocked(worldId), JSON.stringify([...list, cardId]));
    }
  },

  getFamiliarity(worldId: string): number {
    try {
      const raw = localStorage.getItem(KEY.familiarity(worldId));
      const value = raw ? Number(raw) : 0;
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      return 0;
    }
  },
  setFamiliarity(worldId: string, value: number) {
    localStorage.setItem(KEY.familiarity(worldId), JSON.stringify(Math.max(0, Math.floor(value))));
  },
  addFamiliarity(worldId: string, delta: number) {
    const next = this.getFamiliarity(worldId) + Math.max(0, Math.floor(delta));
    this.setFamiliarity(worldId, next);
    return next;
  },

  getCompanionLogs(worldId: string): CompanionLog[] {
    try {
      const raw = localStorage.getItem(KEY.companionLogs(worldId));
      return raw ? (JSON.parse(raw) as CompanionLog[]) : [];
    } catch {
      return [];
    }
  },
  addCompanionLog(worldId: string, log: CompanionLog) {
    const list = this.getCompanionLogs(worldId);
    const next = [...list, log].slice(-50);
    localStorage.setItem(KEY.companionLogs(worldId), JSON.stringify(next));
  },
};
