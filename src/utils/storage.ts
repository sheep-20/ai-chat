import type { CompanionLog, EmotionState, Message, RagChunk, UserProfile } from '../types';

const DEFAULT_API_BASE = 'https://api.deepseek.com/v1';

export interface SettingsState {
  hasEnvApiKey: boolean;
  storedApiKey: string;
  hasApiKey: boolean;
  apiBase: string;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  if (text.trim().startsWith('<')) {
    throw new Error('Local API returned HTML instead of JSON. Start the app with npm run dev so the SQLite API server is available.');
  }

  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Local API returned invalid JSON. Restart npm run dev and try again.');
  }

  if (!response.ok) {
    const message = data?.error?.message || `Request failed ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

export const storage = {
  async getSettings(): Promise<SettingsState> {
    return fetchJson<SettingsState>('/api/settings');
  },

  async saveSettings(input: { apiKey?: string; apiBase?: string }): Promise<void> {
    await fetchJson('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({
        apiKey: input.apiKey ?? '',
        apiBase: input.apiBase?.trim() || DEFAULT_API_BASE,
      }),
    });
  },

  async getProfileState(): Promise<{ profile: UserProfile | null; onboardingDone: boolean }> {
    return fetchJson('/api/profile');
  },

  async saveUserProfile(profile: UserProfile): Promise<void> {
    await fetchJson('/api/profile', {
      method: 'PUT',
      body: JSON.stringify({ profile, onboardingDone: true }),
    });
  },

  async getIntroStoryDone(): Promise<boolean> {
    const data = await fetchJson<{ done: boolean }>('/api/intro-story');
    return data.done;
  },

  async setIntroStoryDone(): Promise<void> {
    await fetchJson('/api/intro-story', { method: 'PUT', body: JSON.stringify({ done: true }) });
  },

  async getMessages(worldId: string): Promise<Message[]> {
    const data = await fetchJson<{ messages: Message[] }>(`/api/messages/${encodeURIComponent(worldId)}`);
    return data.messages ?? [];
  },

  async saveMessages(worldId: string, messages: Message[]): Promise<void> {
    await fetchJson(`/api/messages/${encodeURIComponent(worldId)}`, {
      method: 'POST',
      body: JSON.stringify({ messages }),
    });
  },

  async getUnlocked(worldId: string): Promise<string[]> {
    const data = await fetchJson<{ unlocked: string[] }>(`/api/unlocked/${encodeURIComponent(worldId)}`);
    return data.unlocked ?? [];
  },

  async addUnlocked(worldId: string, cardId: string): Promise<string[]> {
    const data = await fetchJson<{ unlocked: string[] }>(`/api/unlocked/${encodeURIComponent(worldId)}`, {
      method: 'POST',
      body: JSON.stringify({ cardId }),
    });
    return data.unlocked ?? [];
  },

  async getFamiliarity(worldId: string): Promise<number> {
    const data = await fetchJson<{ familiarity: number }>(`/api/familiarity/${encodeURIComponent(worldId)}`);
    return data.familiarity ?? 0;
  },

  async addFamiliarity(worldId: string, delta: number): Promise<number> {
    const data = await fetchJson<{ familiarity: number }>(`/api/familiarity/${encodeURIComponent(worldId)}`, {
      method: 'POST',
      body: JSON.stringify({ delta }),
    });
    return data.familiarity ?? 0;
  },

  async getCompanionLogs(worldId: string): Promise<CompanionLog[]> {
    const data = await fetchJson<{ logs: CompanionLog[] }>(`/api/companion-logs/${encodeURIComponent(worldId)}`);
    return data.logs ?? [];
  },

  async addCompanionLog(worldId: string, log: CompanionLog): Promise<void> {
    await fetchJson(`/api/companion-logs/${encodeURIComponent(worldId)}`, {
      method: 'POST',
      body: JSON.stringify({ log }),
    });
  },

  async generateCompanionSummary(worldId: string, messages: Array<{ role: string; content: string }>): Promise<string> {
    const data = await fetchJson<{ summary: string }>(
      `/api/companion-logs/${encodeURIComponent(worldId)}/generate-summary`,
      {
        method: 'POST',
        body: JSON.stringify({ messages }),
      },
    );
    return data.summary;
  },

  async analyzeEmotion(input: {
    worldId: string;
    text: string;
    recentMessages: Message[];
    profile: UserProfile | null;
  }): Promise<EmotionState> {
    const data = await fetchJson<{ emotion: EmotionState }>('/api/emotion/analyze', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.emotion;
  },

  async getEmotionHistory(worldId: string): Promise<EmotionState[]> {
    const data = await fetchJson<{ emotions: EmotionState[] }>(`/api/emotion/${encodeURIComponent(worldId)}`);
    return data.emotions ?? [];
  },

  async saveEmotion(worldId: string, emotion: EmotionState): Promise<EmotionState[]> {
    const data = await fetchJson<{ emotions: EmotionState[] }>(`/api/emotion/${encodeURIComponent(worldId)}`, {
      method: 'POST',
      body: JSON.stringify({ emotion }),
    });
    return data.emotions ?? [];
  },

  async searchRag(worldId: string, query: string, limit = 5): Promise<RagChunk[]> {
    const data = await fetchJson<{ chunks: RagChunk[] }>('/api/rag/search', {
      method: 'POST',
      body: JSON.stringify({ worldId, query, limit }),
    });
    return data.chunks ?? [];
  },
};
