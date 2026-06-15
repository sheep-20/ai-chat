import { createServer as createHttpServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { createServer as createViteServer, loadEnv } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dataDir = resolve(root, 'data');
const dbPath = resolve(dataDir, 'time-echo.sqlite');
const liaozhaiRagPath = resolve(root, 'src', 'worlds', 'world2', 'rag', 'chunks.json');
const DEFAULT_API_BASE = 'https://api.deepseek.com/v1';

mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

const env = loadEnv('development', root, '');
const envApiKey = (env.VITE_DEEPSEEK_API_KEY || env.VITE_OPENAI_API_KEY || '').trim();
const envApiBase = (env.VITE_DEEPSEEK_API_BASE_URL || env.VITE_API_BASE_URL || '').trim();

const getStmt = db.prepare('SELECT value FROM kv WHERE key = ?');
const setStmt = db.prepare(`
  INSERT INTO kv (key, value, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
`);

function getJson(key, fallback) {
  const row = getStmt.get(key);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
}

function setJson(key, value) {
  setStmt.run(key, JSON.stringify(value), Date.now());
}

function getSetting(key, fallback = '') {
  return getJson(`settings:${key}`, fallback);
}

function setSetting(key, value) {
  setJson(`settings:${key}`, String(value ?? ''));
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      if (!raw.trim()) {
        resolveBody({});
        return;
      }
      try {
        resolveBody(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('Invalid JSON body'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function routeParam(pathname, prefix) {
  if (!pathname.startsWith(prefix)) return null;
  const value = pathname.slice(prefix.length).split('/')[0];
  return value ? decodeURIComponent(value) : null;
}

function getResolvedSettings() {
  const storedApiKey = getSetting('apiKey', '');
  const storedApiBase = getSetting('apiBase', DEFAULT_API_BASE);
  return {
    hasEnvApiKey: !!envApiKey,
    storedApiKey,
    apiKey: envApiKey || storedApiKey,
    apiBase: envApiBase || storedApiBase || DEFAULT_API_BASE,
  };
}

const MOODS = new Set(['sad', 'anxious', 'angry', 'tired', 'lonely', 'happy', 'calm', 'confused', 'crisis', 'unknown']);

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function fallbackEmotion(text, source = 'heuristic') {
  const value = String(text || '').toLowerCase();
  const rules = [
    {
      mood: 'crisis',
      words: ['不想活', '自杀', '死了算了', '结束生命', '伤害自己', 'suicide', 'kill myself'],
      strategy: '先暂停剧情化回应，稳定用户情绪，鼓励用户立刻联系可信任的人或当地紧急支持资源。',
    },
    {
      mood: 'sad',
      words: ['难过', '崩溃', '想哭', '失落', '没意义', '撑不住', '抑郁', 'depressed'],
      strategy: '先承认感受，少说教，给一个很小、可完成的行动建议。',
    },
    {
      mood: 'anxious',
      words: ['焦虑', '慌', '害怕', '紧张', '担心', '压力', 'panic', 'anxious'],
      strategy: '降低信息密度，帮助用户回到当下，把问题拆成一小步。',
    },
    {
      mood: 'angry',
      words: ['生气', '愤怒', '烦死', '气死', '火大', '讨厌', 'angry'],
      strategy: '承认情绪，不争辩，帮助用户表达边界和真正受伤的点。',
    },
    {
      mood: 'tired',
      words: ['累', '疲惫', '困', '没力气', '麻木', 'burnout'],
      strategy: '减少追问，温和陪伴，允许休息，给低负担回应。',
    },
    {
      mood: 'lonely',
      words: ['孤独', '没人懂', '一个人', '没人陪', 'lonely'],
      strategy: '增加陪伴感和持续回应感，让用户感到被看见。',
    },
    {
      mood: 'happy',
      words: ['开心', '高兴', '太好了', '喜欢', '兴奋', 'happy'],
      strategy: '顺势强化积极体验，允许轻松互动和剧情推进。',
    },
    {
      mood: 'confused',
      words: ['迷茫', '不知道', '怎么办', '混乱', 'confused'],
      strategy: '帮用户整理选项，不急着下结论。',
    },
  ];

  const matched = rules.find(rule => rule.words.some(word => value.includes(word)));
  if (!matched) {
    return {
      mood: value.trim() ? 'unknown' : 'calm',
      intensity: value.trim() ? 2 : 1,
      confidence: value.trim() ? 0.35 : 0.5,
      signals: value.trim() ? ['未发现明确情绪词'] : ['空输入或轻量输入'],
      supportStrategy: '保持温和、自然的陪伴语气，必要时轻轻追问。',
      createdAt: Date.now(),
      source,
    };
  }

  return {
    mood: matched.mood,
    intensity: matched.mood === 'crisis' ? 5 : 3,
    confidence: matched.mood === 'crisis' ? 0.9 : 0.65,
    signals: matched.words.filter(word => value.includes(word)).slice(0, 3),
    supportStrategy: matched.strategy,
    createdAt: Date.now(),
    source,
  };
}

function normalizeEmotion(candidate, originalText, source = 'ai') {
  const fallback = fallbackEmotion(originalText, source === 'ai' ? 'fallback' : source);
  const mood = MOODS.has(candidate?.mood) ? candidate.mood : fallback.mood;
  const signals = Array.isArray(candidate?.signals)
    ? candidate.signals.map(item => String(item)).filter(Boolean).slice(0, 5)
    : fallback.signals;
  const supportStrategy = typeof candidate?.supportStrategy === 'string' && candidate.supportStrategy.trim()
    ? candidate.supportStrategy.trim()
    : fallback.supportStrategy;

  return {
    mood,
    intensity: clampNumber(candidate?.intensity, 1, 5, fallback.intensity),
    confidence: clampNumber(candidate?.confidence, 0, 1, fallback.confidence),
    signals,
    supportStrategy,
    createdAt: Date.now(),
    source,
  };
}

function parseJsonObject(text) {
  const cleaned = String(text || '').replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON object');
  return JSON.parse(cleaned.slice(start, end + 1));
}

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[，。！？、；：“”‘’《》（）【】\[\]{}.,!?;:'"()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function queryTerms(query) {
  const normalized = normalizeSearchText(query);
  const terms = new Set();
  for (const term of normalized.split(' ')) {
    if (term.length >= 2) terms.add(term);
  }
  const compact = normalized.replace(/\s/g, '');
  for (let size = 2; size <= 4; size += 1) {
    for (let i = 0; i <= compact.length - size; i += 1) {
      terms.add(compact.slice(i, i + size));
    }
  }
  return [...terms].slice(0, 80);
}

function loadRagChunks(worldId) {
  if (worldId !== 'world2') return [];
  if (!existsSync(liaozhaiRagPath)) return [];
  try {
    const data = JSON.parse(readFileSync(liaozhaiRagPath, 'utf8'));
    return Array.isArray(data?.chunks) ? data.chunks : [];
  } catch {
    return [];
  }
}

function searchRagChunks({ worldId, query, limit }) {
  const chunks = loadRagChunks(worldId);
  const terms = queryTerms(query);
  const max = clampNumber(limit, 1, 8, 5);
  if (!chunks.length || !terms.length) return [];

  return chunks
    .map(chunk => {
      const haystack = normalizeSearchText([
        chunk.storyTitle,
        chunk.sourceName,
        chunk.content,
      ].join('\n'));
      let score = 0;
      for (const term of terms) {
        if (!term) continue;
        const index = haystack.indexOf(term);
        if (index === -1) continue;
        score += term.length >= 3 ? 3 : 1;
        if (normalizeSearchText(chunk.storyTitle).includes(term)) score += 8;
        if (index < 80) score += 1;
      }
      return { chunk, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.chunkIndex - b.chunk.chunkIndex)
    .slice(0, max)
    .map(item => item.chunk);
}

function legacyMemoryKey(item, scope) {
  if (typeof item?.key === 'string' && item.key.trim()) return item.key.trim();
  const source = typeof item?.source === 'string' ? item.source : 'chat';
  const text = String(item?.text || '').replace(/\s+/g, '').toLowerCase().slice(0, 72);
  return `${scope}.${source}.${text || Date.now()}`;
}

function nowMemoryItem(scope, text, source, tags = [], importance = 'medium', confidence = 0.72, key = '', title = '', updatedReason = '') {
  const timestamp = Date.now();
  const item = { key, text, source };
  return {
    id: `${scope}-${timestamp}-${Math.random().toString(16).slice(2)}`,
    key: legacyMemoryKey(item, scope),
    scope,
    title: String(title || '').trim(),
    text: String(text || '').trim(),
    tags: tags.map(tag => String(tag)).filter(Boolean).slice(0, 6),
    source,
    importance,
    confidence: clampNumber(confidence, 0, 1, 0.72),
    updatedReason: String(updatedReason || '').trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function defaultUserMemory() {
  return { items: [] };
}

function defaultWorldMemory(worldId) {
  return { worldId, items: [], completedBondEventNotes: [], lastImportantMoment: '' };
}

function defaultShortTermMemory(worldId) {
  return { worldId, summary: '', openLoops: [], lastUserNeed: '', updatedAt: 0 };
}

function normalizeMemoryItem(item, scope) {
  if (!item || typeof item.text !== 'string' || !item.text.trim()) return null;
  const timestamp = Date.now();
  return {
    id: typeof item.id === 'string' && item.id ? item.id : `${scope}-${timestamp}-${Math.random().toString(16).slice(2)}`,
    key: legacyMemoryKey(item, scope),
    scope,
    title: typeof item.title === 'string' ? item.title.trim().slice(0, 40) : '',
    text: item.text.trim().slice(0, 180),
    tags: Array.isArray(item.tags) ? item.tags.map(tag => String(tag)).filter(Boolean).slice(0, 6) : [],
    source: ['profile', 'chat', 'companion_log', 'bond_event', 'emotion', 'manual'].includes(item.source) ? item.source : 'chat',
    importance: ['low', 'medium', 'high'].includes(item.importance) ? item.importance : 'medium',
    confidence: clampNumber(item.confidence, 0, 1, 0.7),
    updatedReason: typeof item.updatedReason === 'string' ? item.updatedReason.trim().slice(0, 120) : '',
    createdAt: Number(item.createdAt) || timestamp,
    updatedAt: Number(item.updatedAt) || timestamp,
  };
}

function mergeMemoryItems(existing, incoming, scope, maxItems) {
  const normalized = [
    ...(Array.isArray(existing) ? existing : []),
    ...(Array.isArray(incoming) ? incoming : []),
  ]
    .map(item => normalizeMemoryItem(item, scope))
    .filter(Boolean);
  const seen = new Map();
  for (const item of normalized) {
    const key = item.key || item.text.replace(/\s+/g, '').toLowerCase();
    const previous = seen.get(key);
    if (!previous || previous.confidence < item.confidence || previous.importance === 'low') {
      seen.set(key, {
        ...previous,
        ...item,
        createdAt: previous?.createdAt || item.createdAt,
        updatedAt: Date.now(),
      });
    }
  }
  const rank = { high: 3, medium: 2, low: 1 };
  return [...seen.values()]
    .sort((a, b) => (rank[b.importance] - rank[a.importance]) || (b.updatedAt - a.updatedAt))
    .slice(0, maxItems);
}

function normalizeUserMemory(memory) {
  return { items: mergeMemoryItems([], memory?.items, 'user', 30) };
}

function normalizeWorldMemory(worldId, memory) {
  const notes = Array.isArray(memory?.completedBondEventNotes)
    ? memory.completedBondEventNotes
        .filter(note => note && typeof note.eventId === 'string')
        .map(note => ({
          eventId: note.eventId,
          title: String(note.title || ''),
          choiceText: typeof note.choiceText === 'string' ? note.choiceText : '',
          completedAt: Number(note.completedAt) || Date.now(),
        }))
        .slice(-20)
    : [];
  return {
    worldId,
    items: mergeMemoryItems([], memory?.items, 'world', 40),
    completedBondEventNotes: notes,
    lastImportantMoment: typeof memory?.lastImportantMoment === 'string' ? memory.lastImportantMoment.slice(0, 180) : '',
  };
}

function normalizeShortTermMemory(worldId, memory) {
  return {
    worldId,
    summary: typeof memory?.summary === 'string' ? memory.summary.slice(0, 240) : '',
    openLoops: Array.isArray(memory?.openLoops) ? memory.openLoops.map(item => String(item)).filter(Boolean).slice(0, 6) : [],
    lastUserNeed: typeof memory?.lastUserNeed === 'string' ? memory.lastUserNeed.slice(0, 160) : '',
    updatedAt: Number(memory?.updatedAt) || Date.now(),
  };
}

function heuristicMemoryExtraction(body) {
  const worldId = String(body.worldId || 'unknown');
  const userMessages = Array.isArray(body.messages) ? body.messages.filter(message => message.role === 'user') : [];
  const recentUser = userMessages.slice(-3).map(message => String(message.content || '').trim()).filter(Boolean);
  const topics = Array.isArray(body.topics) ? body.topics.map(topic => String(topic)).filter(Boolean) : [];
  const unlockedTitles = Array.isArray(body.unlockedTitles) ? body.unlockedTitles.map(title => String(title)).filter(Boolean) : [];
  const profile = body.profile || {};

  const userItems = [];
  if (profile.displayName) userItems.push(nowMemoryItem('user', `用户希望被称呼为“${profile.displayName}”。`, 'profile', ['称呼'], 'high', 0.95, 'profile.displayName', '称呼方式', '来自用户资料'));
  if (profile.interactionStyle) userItems.push(nowMemoryItem('user', `用户偏好的互动方式：${profile.interactionStyle}`, 'profile', ['互动偏好'], 'high', 0.9, 'profile.interactionStyle', '互动方式', '来自用户资料'));
  if (profile.emotionalSupport) userItems.push(nowMemoryItem('user', `用户低落时希望的陪伴方式：${profile.emotionalSupport}`, 'profile', ['情绪陪伴'], 'high', 0.9, 'profile.emotionalSupport', '陪伴偏好', '来自用户资料'));
  if (profile.boundaries) userItems.push(nowMemoryItem('user', `用户明确的剧情边界与雷区：${profile.boundaries}`, 'profile', ['边界'], 'high', 0.92, 'profile.boundaries', '剧情边界', '来自用户资料'));
  if (profile.preferredWorld) userItems.push(nowMemoryItem('user', `用户偏好的世界或题材：${profile.preferredWorld}`, 'profile', ['题材偏好'], 'medium', 0.86, 'profile.preference', '题材偏好', '来自用户资料'));
  if (profile.memoryNotes) userItems.push(nowMemoryItem('user', `用户长期偏好备注：${profile.memoryNotes}`, 'profile', ['长期偏好'], 'medium', 0.82, 'profile.lifeFact', '长期备注', '来自用户资料'));

  const worldItems = [];
  if (unlockedTitles.length) {
    worldItems.push(nowMemoryItem(
      'world',
      `本次新记录的图鉴线索：${unlockedTitles.slice(0, 4).join('、')}。`,
      'companion_log',
      ['图鉴'],
      'medium',
      0.74,
      `world.${worldId}.topic.${unlockedTitles.slice(0, 2).join('-')}`,
      '图鉴线索',
      '来自本次图鉴解锁',
    ));
  }

  return {
    userItems,
    worldItems,
    shortTerm: {
      worldId,
      summary: recentUser.length ? `最近用户提到：${recentUser.join(' / ')}` : (topics.length ? `最近围绕 ${topics.join('、')} 展开。` : ''),
      openLoops: topics.slice(0, 4),
      lastUserNeed: recentUser[recentUser.length - 1] || '',
      updatedAt: Date.now(),
    },
  };
}

async function extractMemoryWithModel(body) {
  const fallback = heuristicMemoryExtraction(body);
  const settings = getResolvedSettings();
  if (!settings.apiKey) return fallback;

  const recentMessages = Array.isArray(body.messages)
    ? body.messages.slice(-24).map(message => `${message.role}: ${message.content}`).join('\n')
    : '';
  const prompt = [
    '请从本次角色陪伴对话中提取结构化记忆，输出严格 JSON，不要 Markdown。',
    '宁缺毋滥：普通闲聊不生成长期记忆，最多提取 2 条 userItems 和 2 条 worldItems。',
    '只记录用户明确表达的稳定偏好、边界、称呼、陪伴方式，以及当前世界内真实发生的重要互动经历。',
    '优先用稳定 key 更新旧记忆，而不是新增碎片。',
    '不要写医疗诊断、人格标签、危机风险推断或用户没有明确表达的敏感信息。',
    '用户 key 示例：profile.displayName, profile.interactionStyle, profile.emotionalSupport, profile.boundaries, profile.preference, profile.lifeFact。',
    `世界 key 示例：world.${body.worldId}.bond.eventId, world.${body.worldId}.topic.topicName, world.${body.worldId}.importantMoment。`,
    'JSON 结构：{"userItems":[{"key":"","title":"","text":"","tags":[],"importance":"low|medium|high","confidence":0.8,"updatedReason":""}],"worldItems":[{"key":"","title":"","text":"","tags":[],"importance":"low|medium|high","confidence":0.8,"updatedReason":""}],"shortTerm":{"summary":"","openLoops":[],"lastUserNeed":""}}',
    `世界：${body.worldName || body.worldId}`,
    `角色：${body.npcName || ''}`,
    `用户资料：${JSON.stringify(body.profile || {})}`,
    `陪伴日志：${body.companionSummary || ''}`,
    `话题：${JSON.stringify(body.topics || [])}`,
    `新图鉴：${JSON.stringify(body.unlockedTitles || [])}`,
    '最近对话：',
    recentMessages,
  ].join('\n');

  try {
    const upstream = await fetch(`${settings.apiBase.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: body.model || 'deepseek-chat',
        stream: false,
        temperature: 0.2,
        max_tokens: 700,
        messages: [
          { role: 'system', content: '你是 TIME ECHO 的记忆整理器，只输出可解析 JSON。' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!upstream.ok) return fallback;
    const json = await upstream.json();
    const content = json?.choices?.[0]?.message?.content || '';
    const parsed = parseJsonObject(content);
    return {
      userItems: Array.isArray(parsed.userItems)
        ? parsed.userItems.slice(0, 2).map(item => nowMemoryItem('user', item.text, 'chat', item.tags, item.importance, item.confidence, item.key, item.title, item.updatedReason))
        : fallback.userItems,
      worldItems: Array.isArray(parsed.worldItems)
        ? parsed.worldItems.slice(0, 2).map(item => nowMemoryItem('world', item.text, 'chat', item.tags, item.importance, item.confidence, item.key, item.title, item.updatedReason))
        : fallback.worldItems,
      shortTerm: normalizeShortTermMemory(String(body.worldId || 'unknown'), parsed.shortTerm || fallback.shortTerm),
    };
  } catch {
    return fallback;
  }
}

async function analyzeEmotionWithModel(body) {
  const settings = getResolvedSettings();
  if (!settings.apiKey) return fallbackEmotion(body.text, 'heuristic');

  const prompt = [
    '请分析用户这条输入的当前情绪，只输出 JSON，不要输出解释。',
    'mood 只能是 sad/anxious/angry/tired/lonely/happy/calm/confused/crisis/unknown。',
    'intensity 为 1-5，confidence 为 0-1。',
    'supportStrategy 用中文写一句给角色的回复策略。不要做医疗诊断。',
    '如果出现自伤、自杀、现实危险等内容，mood 必须为 crisis。',
    `用户资料：${JSON.stringify(body.profile || {})}`,
    `最近对话：${JSON.stringify((body.recentMessages || []).slice(-8))}`,
    `用户输入：${body.text}`,
    'JSON 格式：{"mood":"sad","intensity":3,"confidence":0.8,"signals":["..."],"supportStrategy":"..."}',
  ].join('\n');

  try {
    const upstream = await fetch(`${settings.apiBase.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: body.model || 'deepseek-chat',
        stream: false,
        temperature: 0.1,
        max_tokens: 260,
        messages: [
          { role: 'system', content: '你是一个情绪识别器，只输出严格 JSON。' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!upstream.ok) return fallbackEmotion(body.text, 'heuristic');
    const json = await upstream.json();
    const content = json?.choices?.[0]?.message?.content ?? '';
    return normalizeEmotion(parseJsonObject(content), body.text, 'ai');
  } catch {
    return fallbackEmotion(body.text, 'heuristic');
  }
}

async function proxyChat(req, res) {
  const settings = getResolvedSettings();
  if (!settings.apiKey) {
    sendJson(res, 400, { error: { message: '缺少 DeepSeek API Key，请先在设置中填写。' } });
    return;
  }

  const body = await readBody(req);
  const target = `${settings.apiBase.replace(/\/$/, '')}/chat/completions`;
  const upstream = await fetch(target, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  res.writeHead(upstream.status, {
    'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });

  if (!upstream.body) {
    res.end();
    return;
  }

  const reader = upstream.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}

async function handleApi(req, res) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.pathname;
  const method = req.method ?? 'GET';

  try {
    if (path === '/api/health') {
      sendJson(res, 200, { ok: true, dbPath });
      return true;
    }

    if (path === '/api-proxy/chat/completions' && method === 'POST') {
      await proxyChat(req, res);
      return true;
    }

    if (path === '/api/settings') {
      if (method === 'GET') {
        const settings = getResolvedSettings();
        sendJson(res, 200, {
          hasEnvApiKey: settings.hasEnvApiKey,
          storedApiKey: settings.storedApiKey,
          hasApiKey: !!settings.apiKey,
          apiBase: settings.apiBase,
        });
        return true;
      }
      if (method === 'PUT') {
        const body = await readBody(req);
        if (typeof body.apiKey === 'string' && body.apiKey.trim()) {
          setSetting('apiKey', body.apiKey.trim());
        }
        if (typeof body.apiBase === 'string') {
          setSetting('apiBase', body.apiBase.trim() || DEFAULT_API_BASE);
        }
        sendJson(res, 200, { ok: true, ...getResolvedSettings(), apiKey: undefined });
        return true;
      }
    }

    if (path === '/api/profile') {
      if (method === 'GET') {
        sendJson(res, 200, { profile: getJson('profile', null), onboardingDone: !!getJson('flag:onboardingDone', false) });
        return true;
      }
      if (method === 'PUT') {
        const body = await readBody(req);
        setJson('profile', body.profile ?? null);
        if (body.onboardingDone !== false) setJson('flag:onboardingDone', true);
        sendJson(res, 200, { ok: true });
        return true;
      }
    }

    if (path === '/api/intro-story') {
      if (method === 'GET') {
        sendJson(res, 200, { done: !!getJson('flag:introStoryDone', false) });
        return true;
      }
      if (method === 'PUT') {
        setJson('flag:introStoryDone', true);
        sendJson(res, 200, { ok: true });
        return true;
      }
    }

    if (path === '/api/memory/user') {
      const key = 'memory:user';
      if (method === 'GET') {
        sendJson(res, 200, { memory: normalizeUserMemory(getJson(key, defaultUserMemory())) });
        return true;
      }
      if (method === 'PUT') {
        const body = await readBody(req);
        const memory = normalizeUserMemory(body.memory || defaultUserMemory());
        setJson(key, memory);
        sendJson(res, 200, { memory });
        return true;
      }
    }

    const worldMemoryId = routeParam(path, '/api/memory/world/');
    if (worldMemoryId) {
      const key = `memory:world:${worldMemoryId}`;
      if (method === 'GET') {
        sendJson(res, 200, { memory: normalizeWorldMemory(worldMemoryId, getJson(key, defaultWorldMemory(worldMemoryId))) });
        return true;
      }
      if (method === 'PUT') {
        const body = await readBody(req);
        const memory = normalizeWorldMemory(worldMemoryId, body.memory || defaultWorldMemory(worldMemoryId));
        setJson(key, memory);
        sendJson(res, 200, { memory });
        return true;
      }
    }

    const shortMemoryId = routeParam(path, '/api/memory/short-term/');
    if (shortMemoryId) {
      const key = `memory:short:${shortMemoryId}`;
      if (method === 'GET') {
        sendJson(res, 200, { memory: normalizeShortTermMemory(shortMemoryId, getJson(key, defaultShortTermMemory(shortMemoryId))) });
        return true;
      }
      if (method === 'PUT') {
        const body = await readBody(req);
        const memory = normalizeShortTermMemory(shortMemoryId, body.memory || defaultShortTermMemory(shortMemoryId));
        setJson(key, memory);
        sendJson(res, 200, { memory });
        return true;
      }
    }

    if (path === '/api/memory/extract' && method === 'POST') {
      const body = await readBody(req);
      const worldId = String(body.worldId || 'unknown');
      const extracted = await extractMemoryWithModel(body);
      const userKey = 'memory:user';
      const worldKey = `memory:world:${worldId}`;
      const shortKey = `memory:short:${worldId}`;
      const userMemory = normalizeUserMemory({
        items: mergeMemoryItems(getJson(userKey, defaultUserMemory()).items, extracted.userItems, 'user', 30),
      });
      const previousWorld = normalizeWorldMemory(worldId, getJson(worldKey, defaultWorldMemory(worldId)));
      const worldMemory = normalizeWorldMemory(worldId, {
        ...previousWorld,
        items: mergeMemoryItems(previousWorld.items, extracted.worldItems, 'world', 40),
        lastImportantMoment: extracted.worldItems?.[0]?.text || previousWorld.lastImportantMoment,
      });
      const shortTermMemory = normalizeShortTermMemory(worldId, extracted.shortTerm);
      setJson(userKey, userMemory);
      setJson(worldKey, worldMemory);
      setJson(shortKey, shortTermMemory);
      sendJson(res, 200, { userMemory, worldMemory, shortTermMemory });
      return true;
    }

    const bondMemoryId = routeParam(path, '/api/memory/bond-event/');
    if (bondMemoryId && method === 'POST') {
      const body = await readBody(req);
      const event = body.event || {};
      const key = `memory:world:${bondMemoryId}`;
      const previous = normalizeWorldMemory(bondMemoryId, getJson(key, defaultWorldMemory(bondMemoryId)));
      const title = String(event.title || '羁绊事件');
      const choiceText = typeof body.choiceText === 'string' ? body.choiceText : '';
      const note = {
        eventId: String(event.id || `event-${Date.now()}`),
        title,
        choiceText,
        completedAt: Date.now(),
      };
      const text = choiceText
        ? `用户在羁绊事件“${title}”中选择回应：“${choiceText.slice(0, 80)}”。`
        : `用户完成了羁绊事件“${title}”。`;
      const memory = normalizeWorldMemory(bondMemoryId, {
        ...previous,
        items: mergeMemoryItems(previous.items, [nowMemoryItem(
          'world',
          text,
          'bond_event',
          ['羁绊事件', title],
          'high',
          0.92,
          `world.${bondMemoryId}.bond.${note.eventId}`,
          title,
          '羁绊事件完成',
        )], 'world', 40),
        completedBondEventNotes: [...previous.completedBondEventNotes.filter(item => item.eventId !== note.eventId), note].slice(-20),
        lastImportantMoment: text,
      });
      setJson(key, memory);
      sendJson(res, 200, { memory });
      return true;
    }

    if (path === '/api/emotion/analyze' && method === 'POST') {
      const body = await readBody(req);
      const emotion = await analyzeEmotionWithModel(body);
      sendJson(res, 200, { emotion });
      return true;
    }

    if (path === '/api/rag/search' && method === 'POST') {
      const body = await readBody(req);
      const chunks = searchRagChunks({
        worldId: body.worldId,
        query: body.query,
        limit: body.limit,
      });
      sendJson(res, 200, { chunks });
      return true;
    }

    const emotionWorld = routeParam(path, '/api/emotion/');
    if (emotionWorld) {
      const key = `emotions:${emotionWorld}`;
      if (method === 'GET') {
        sendJson(res, 200, { emotions: getJson(key, []) });
        return true;
      }
      if (method === 'POST') {
        const body = await readBody(req);
        const current = getJson(key, []);
        const emotion = normalizeEmotion(body.emotion, '', body.emotion?.source || 'fallback');
        const next = [...current, emotion].slice(-30);
        setJson(key, next);
        sendJson(res, 200, { emotions: next });
        return true;
      }
    }

    const messagesWorld = routeParam(path, '/api/messages/');
    if (messagesWorld) {
      const key = `messages:${messagesWorld}`;
      if (method === 'GET') {
        sendJson(res, 200, { messages: getJson(key, []) });
        return true;
      }
      if (method === 'POST' || method === 'PUT') {
        const body = await readBody(req);
        setJson(key, Array.isArray(body.messages) ? body.messages : []);
        sendJson(res, 200, { ok: true });
        return true;
      }
    }

    const unlockedWorld = routeParam(path, '/api/unlocked/');
    if (unlockedWorld) {
      const key = `unlocked:${unlockedWorld}`;
      if (method === 'GET') {
        sendJson(res, 200, { unlocked: getJson(key, []) });
        return true;
      }
      if (method === 'POST') {
        const body = await readBody(req);
        const current = getJson(key, []);
        const next = typeof body.cardId === 'string' && !current.includes(body.cardId)
          ? [...current, body.cardId]
          : current;
        setJson(key, next);
        sendJson(res, 200, { unlocked: next });
        return true;
      }
    }

    const familiarityWorld = routeParam(path, '/api/familiarity/');
    if (familiarityWorld) {
      const key = `familiarity:${familiarityWorld}`;
      if (method === 'GET') {
        sendJson(res, 200, { familiarity: Number(getJson(key, 0)) || 0 });
        return true;
      }
      if (method === 'POST') {
        const body = await readBody(req);
        const current = Number(getJson(key, 0)) || 0;
        const next = Math.max(0, Math.floor(body.value ?? (current + Number(body.delta ?? 0))));
        setJson(key, next);
        sendJson(res, 200, { familiarity: next });
        return true;
      }
    }

    const bondEventsWorld = routeParam(path, '/api/bond-events/');
    if (bondEventsWorld) {
      const key = `bondEvents:${bondEventsWorld}`;
      if (method === 'GET') {
        sendJson(res, 200, { completed: getJson(key, []) });
        return true;
      }
      if (method === 'POST') {
        const body = await readBody(req);
        const current = getJson(key, []);
        const next = typeof body.eventId === 'string' && !current.includes(body.eventId)
          ? [...current, body.eventId]
          : current;
        setJson(key, next);
        sendJson(res, 200, { completed: next });
        return true;
      }
    }

    const logsWorld = routeParam(path, '/api/companion-logs/');
    if (logsWorld && !path.endsWith('/generate-summary')) {
      const key = `companionLogs:${logsWorld}`;
      if (method === 'GET') {
        sendJson(res, 200, { logs: getJson(key, []) });
        return true;
      }
      if (method === 'POST') {
        const body = await readBody(req);
        const current = getJson(key, []);
        const next = [...current, body.log].filter(Boolean).slice(-50);
        setJson(key, next);
        sendJson(res, 200, { logs: next });
        return true;
      }
    }

    if (logsWorld && path.endsWith('/generate-summary') && method === 'POST') {
      const body = await readBody(req);
      const settings = getResolvedSettings();
      if (!settings.apiKey) throw Object.assign(new Error('缺少 API Key'), { statusCode: 400 });

      const upstream = await fetch(`${settings.apiBase.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model: body.model || 'deepseek-chat',
          stream: false,
          temperature: 0.95,
          max_tokens: 360,
          messages: body.messages,
        }),
      });
      if (!upstream.ok) {
        const text = await upstream.text();
        throw Object.assign(new Error(text || `API 错误 ${upstream.status}`), { statusCode: upstream.status });
      }
      const json = await upstream.json();
      const summary = json?.choices?.[0]?.message?.content?.trim() || '';
      sendJson(res, 200, { summary });
      return true;
    }

    return false;
  } catch (error) {
    const statusCode = error.statusCode || 500;
    sendJson(res, statusCode, { error: { message: error.message || String(error) } });
    return true;
  }
}

const vite = await createViteServer({
  root,
  server: { middlewareMode: true },
  appType: 'spa',
});

const server = createHttpServer(async (req, res) => {
  const handled = await handleApi(req, res);
  if (handled) return;
  vite.middlewares(req, res, () => {
    if (!res.writableEnded) {
      res.statusCode = 404;
      res.end('Not found');
    }
  });
});

const port = Number(process.env.PORT || 5173);
server.listen(port, '127.0.0.1', () => {
  console.log(`[time-echo] Local data: ${dbPath}`);
  console.log(`[time-echo] Dev server: http://127.0.0.1:${port}`);
});
