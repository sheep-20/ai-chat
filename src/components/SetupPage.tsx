import { useState } from 'react';
import { storage } from '../utils/storage';
import { ParticleBackground } from './ParticleBackground';
import { X } from 'lucide-react';

interface Props {
  isEditing?: boolean;
  onSetup: () => void;
  onCancel?: () => void;
}

export function SetupPage({ isEditing, onSetup, onCancel }: Props) {
  const [apiKey, setApiKey] = useState(isEditing ? storage.getApiKey() : '');
  const [apiBase, setApiBase] = useState(storage.getApiBase());
  const [showAdvanced, setShowAdvanced] = useState(
    isEditing && storage.getApiBase() !== 'https://api.openai.com/v1'
  );
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const key = apiKey.trim();
    if (!key) { setError('请填写 API Key'); return; }
    storage.setApiKey(key);
    storage.setApiBase(apiBase.trim() || 'https://api.openai.com/v1');
    onSetup();
  }

  return (
    <div className="relative min-h-screen bg-space-950 flex items-center justify-center p-6">
      <ParticleBackground />
      <div className="relative z-10 w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <div
            className="font-orbitron text-4xl font-black tracking-widest text-cyan-400 mb-1"
            style={{ textShadow: '0 0 30px rgba(6,182,212,0.8)' }}
          >
            TIME ECHO
          </div>
          <div className="text-slate-600 text-sm tracking-[0.3em] font-mono">时间回声</div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-space-900 border border-space-700 rounded-2xl p-8 space-y-5 relative"
          style={{ boxShadow: '0 0 40px rgba(6,182,212,0.08)' }}
        >
          {/* Cancel button when editing */}
          {isEditing && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center
                         text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
            >
              <X size={16} />
            </button>
          )}

          <div>
            <p className="text-slate-200 font-semibold text-sm mb-1">
              {isEditing ? '修改 API 设置' : '填写 API Key 开始使用'}
            </p>
            <p className="text-slate-500 text-xs leading-relaxed">
              Key 仅存储在本地浏览器，不会上传到任何服务器。
              <br />
              国内用户需要填写代理地址（见高级选项）。
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-mono">API KEY</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setError(''); }}
              placeholder="sk-..."
              className="w-full bg-space-800 border border-space-600 rounded-lg px-4 py-3
                         text-slate-200 font-mono text-sm focus:outline-none focus:border-cyan-500/60
                         placeholder:text-slate-600 transition-colors"
            />
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-slate-500 hover:text-cyan-400 transition-colors font-mono"
          >
            {showAdvanced ? '▲' : '▼'} 高级选项 · 代理地址（国内必填）
          </button>

          {showAdvanced && (
            <div className="space-y-1.5 p-4 rounded-xl bg-space-800/50 border border-space-700">
              <label className="text-xs text-slate-400 font-mono">API BASE URL</label>
              <input
                type="text"
                value={apiBase}
                onChange={e => setApiBase(e.target.value)}
                className="w-full bg-space-800 border border-space-600 rounded-lg px-4 py-3
                           text-slate-200 font-mono text-sm focus:outline-none focus:border-cyan-500/60
                           transition-colors"
              />
              <p className="text-xs text-slate-500 leading-relaxed mt-2">
                国内无法直连 OpenAI，请填写中转代理地址，例如：
                <br />
                <span className="text-slate-400 font-mono">https://api2d.com/v1</span>
                <br />
                <span className="text-slate-400 font-mono">https://openrouter.ai/api/v1</span>
                <br />
                或你自己的代理服务地址
              </p>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-xs font-mono bg-red-900/20 px-3 py-2 rounded-lg border border-red-900/40">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-lg font-orbitron text-sm tracking-widest font-semibold
                       bg-cyan-500/10 border border-cyan-500/50 text-cyan-400
                       hover:bg-cyan-500/20 hover:border-cyan-400
                       hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]
                       transition-all duration-300"
          >
            {isEditing ? '保存设置' : '进入时间回声'}
          </button>
        </form>
      </div>
    </div>
  );
}
