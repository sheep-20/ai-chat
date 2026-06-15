import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { storage, type SettingsState } from '../utils/storage';
import { ParticleBackground } from './ParticleBackground';

interface Props {
  isEditing?: boolean;
  onSetup: () => void;
  onCancel?: () => void;
}

const DEFAULT_API_BASE = 'https://api.deepseek.com/v1';

export function SetupPage({ isEditing, onSetup, onCancel }: Props) {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    storage.getSettings()
      .then(next => {
        if (!alive) return;
        setSettings(next);
        setApiKey(isEditing ? next.storedApiKey : '');
        setApiBase(next.apiBase || DEFAULT_API_BASE);
        setShowAdvanced(!!isEditing && next.apiBase !== DEFAULT_API_BASE);
      })
      .catch(err => setError(err instanceof Error ? err.message : String(err)));
    return () => { alive = false; };
  }, [isEditing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const key = apiKey.trim();
    if (!key && !settings?.hasEnvApiKey && !settings?.hasApiKey) {
      setError('请填写 DeepSeek API Key');
      return;
    }

    try {
      setSaving(true);
      await storage.saveSettings({ apiKey: key, apiBase });
      onSetup();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-space-950 p-6">
      <ParticleBackground />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-10 text-center">
          <div
            className="mb-1 font-orbitron text-4xl font-black tracking-widest text-cyan-400"
            style={{ textShadow: '0 0 30px rgba(6,182,212,0.8)' }}
          >
            TIME ECHO
          </div>
          <div className="font-mono text-sm tracking-[0.3em] text-slate-600">时间回声</div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="relative space-y-5 rounded-2xl border border-space-700 bg-space-900 p-8"
          style={{ boxShadow: '0 0 40px rgba(6,182,212,0.08)' }}
        >
          {isEditing && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
            >
              <X size={16} />
            </button>
          )}

          <div>
            <p className="mb-1 text-sm font-semibold text-slate-200">
              {isEditing ? '修改 DeepSeek API 设置' : '填写 DeepSeek API Key 开始使用'}
            </p>
            <p className="text-xs leading-relaxed text-slate-500">
              {settings?.hasEnvApiKey
                ? '已从 .env 读取 DeepSeek API Key，页面无需再次填写。'
                : 'Key 会保存到本地 SQLite 数据文件，不再写入浏览器 localStorage。'}
              <br />
              默认使用 DeepSeek API，必要时可在高级选项里修改接口地址。
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="font-mono text-xs text-slate-400">API KEY</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setError(''); }}
              placeholder={settings?.hasEnvApiKey ? '已从 .env 读取' : 'sk-...'}
              className="w-full rounded-lg border border-space-600 bg-space-800 px-4 py-3 font-mono text-sm text-slate-200 transition-colors placeholder:text-slate-600 focus:border-cyan-500/60 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="font-mono text-xs text-slate-500 transition-colors hover:text-cyan-400"
          >
            {showAdvanced ? '收起' : '展开'}高级选项 · DeepSeek 接口地址
          </button>

          {showAdvanced && (
            <div className="space-y-1.5 rounded-xl border border-space-700 bg-space-800/50 p-4">
              <label className="font-mono text-xs text-slate-400">API BASE URL</label>
              <input
                type="text"
                value={apiBase}
                onChange={e => setApiBase(e.target.value)}
                className="w-full rounded-lg border border-space-600 bg-space-800 px-4 py-3 font-mono text-sm text-slate-200 transition-colors focus:border-cyan-500/60 focus:outline-none"
              />
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                默认地址为 <span className="font-mono text-slate-400">{DEFAULT_API_BASE}</span>。
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-900/40 bg-red-900/20 px-3 py-2 font-mono text-xs text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || !settings}
            className="w-full rounded-lg border border-cyan-500/50 bg-cyan-500/10 py-3 font-orbitron text-sm font-semibold tracking-widest text-cyan-400 transition-all duration-300 hover:border-cyan-400 hover:bg-cyan-500/20 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? '保存中...' : isEditing ? '保存设置' : '进入时间回声'}
          </button>
        </form>
      </div>
    </div>
  );
}
