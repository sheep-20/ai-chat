import type { Message } from '../types';

const KEY = {
  apiKey:   'te_api_key',
  apiBase:  'te_api_base',
  messages: (wid: string) => `te_messages_${wid}`,
  unlocked: (wid: string) => `te_unlocked_${wid}`,
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
};
