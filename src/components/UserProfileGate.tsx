import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, UserRound, X } from 'lucide-react';
import { storage } from '../utils/storage';
import { ParticleBackground } from './ParticleBackground';
import type { UserProfile } from '../types';

interface Props {
  mode: 'onboarding' | 'modal';
  onComplete: () => void;
  onCancel?: () => void;
}

const DEFAULT_PROFILE: UserProfile = {
  displayName: '',
  personality: '',
  preferredWorld: '',
  interactionStyle: '',
  emotionalSupport: '',
  boundaries: '',
  memoryNotes: '',
  updatedAt: 0,
};

const TRAIT_OPTIONS = ['冷静', '好奇', '慢热', '直觉派'];
const WORLD_OPTIONS = ['赛博', '星际', '古风', '海洋'];
const INTERACTION_OPTIONS = ['沉浸剧情', '温柔陪伴', '轻松吐槽', '主动推进'];
const SUPPORT_OPTIONS = ['安静陪伴', '温柔鼓励', '帮我拆解问题', '转移注意力'];

function addToken(current: string, token: string) {
  if (current.includes(token)) return current;
  return current.trim() ? `${current.trim()}、${token}` : token;
}

export function UserProfileGate({ mode, onComplete, onCancel }: Props) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isOnboarding = mode === 'onboarding';

  useEffect(() => {
    let alive = true;
    storage.getProfileState()
      .then(state => {
        if (!alive) return;
        setProfile({ ...DEFAULT_PROFILE, ...(state.profile ?? {}) });
        setLoading(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  function update<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setProfile(prev => ({ ...prev, [key]: value }));
  }

  function append(key: keyof Pick<UserProfile, 'personality' | 'preferredWorld' | 'interactionStyle' | 'emotionalSupport'>, token: string) {
    setProfile(prev => ({ ...prev, [key]: addToken(prev[key], token) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      await storage.saveUserProfile({
        ...profile,
        displayName: profile.displayName.trim() || '回声旅人',
        updatedAt: Date.now(),
      });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative z-10 w-full max-w-5xl"
    >
      <div className="grid overflow-hidden border border-cyan-500/20 bg-space-900/92 shadow-[0_0_42px_rgba(6,182,212,0.1)] backdrop-blur-xl lg:grid-cols-[0.65fr_1.35fr]">
        <section className="border-b border-cyan-500/15 p-5 lg:border-b-0 lg:border-r lg:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10 font-orbitron text-lg text-cyan-200">
              ◇
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-100">艾希 · 量子残魂</div>
              <div className="font-mono text-xs tracking-widest text-cyan-400/80">USER SYNC</div>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm leading-6 text-slate-300">
            <p>建立一份本地同行档案，让角色知道该如何称呼你、用什么语气陪伴你，以及哪些内容需要避开。</p>
            <p className="text-cyan-200/90">资料只写入本地 SQLite，可随时从右上角用户按钮修改。</p>
          </div>

          <div className="mt-6 grid gap-2 text-xs text-slate-500">
            <CompactNote title="必填很少" text="不想细填时，只写称呼也可以继续。" />
            <CompactNote title="偏好会生效" text="语气、节奏、题材和边界会参与后续对话。" />
            <CompactNote title="支持情绪陪伴" text="低落或焦虑时，角色会参考你的陪伴偏好。" />
          </div>
        </section>

        <form onSubmit={handleSubmit} className="relative p-5 lg:p-6">
          {!isOnboarding && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
              title="关闭"
            >
              <X size={16} />
            </button>
          )}

          <div className="mb-4 flex items-center gap-3">
            <UserRound className="text-cyan-300" size={20} />
            <div>
              <h2 className="text-base font-semibold text-slate-100">用户资料</h2>
              <p className="text-xs text-slate-500">用于称呼、语气、剧情偏好和情绪陪伴策略</p>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center font-mono text-sm text-cyan-300">正在读取本地资料...</div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="希望被称呼为">
                  <input
                    value={profile.displayName}
                    onChange={e => update('displayName', e.target.value)}
                    placeholder="例如：小马、博士、旅人"
                    className="profile-input profile-input-compact"
                  />
                </Field>

                <Field label="你希望呈现的性格">
                  <input
                    value={profile.personality}
                    onChange={e => update('personality', e.target.value)}
                    placeholder="冷静、好奇、慢热..."
                    className="profile-input profile-input-compact"
                  />
                  <QuickChips options={TRAIT_OPTIONS} onPick={token => append('personality', token)} />
                </Field>

                <Field label="偏好的世界">
                  <input
                    value={profile.preferredWorld}
                    onChange={e => update('preferredWorld', e.target.value)}
                    placeholder="赛博、星际、古风、海洋..."
                    className="profile-input profile-input-compact"
                  />
                  <QuickChips options={WORLD_OPTIONS} onPick={token => append('preferredWorld', token)} />
                </Field>

                <Field label="喜欢的互动方式">
                  <input
                    value={profile.interactionStyle}
                    onChange={e => update('interactionStyle', e.target.value)}
                    placeholder="温柔陪伴、沉浸剧情、轻松吐槽..."
                    className="profile-input profile-input-compact"
                  />
                  <QuickChips options={INTERACTION_OPTIONS} onPick={token => append('interactionStyle', token)} />
                </Field>
              </div>

              <div className="mt-3 grid gap-3">
                <Field label="情绪低落时希望被怎样陪伴">
                  <input
                    value={profile.emotionalSupport}
                    onChange={e => update('emotionalSupport', e.target.value)}
                    placeholder="安静陪伴、温柔鼓励、帮我拆解问题..."
                    className="profile-input profile-input-compact"
                  />
                  <QuickChips options={SUPPORT_OPTIONS} onPick={token => append('emotionalSupport', token)} />
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="剧情边界与雷区">
                    <textarea
                      value={profile.boundaries}
                      onChange={e => update('boundaries', e.target.value)}
                      placeholder="不想出现的内容、希望避开的称呼或互动方式"
                      rows={2}
                      className="profile-input resize-none"
                    />
                  </Field>

                  <Field label="想让角色长期记住的偏好">
                    <textarea
                      value={profile.memoryNotes}
                      onChange={e => update('memoryNotes', e.target.value)}
                      placeholder="喜欢主动推进剧情、细腻描写、慢节奏探索等"
                      rows={2}
                      className="profile-input resize-none"
                    />
                  </Field>
                </div>
              </div>
            </>
          )}

          {error && (
            <p className="mt-4 rounded-lg border border-red-900/40 bg-red-900/20 px-3 py-2 font-mono text-xs text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || saving}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-500/50 bg-cyan-500/10 py-2.5 font-orbitron text-sm font-semibold tracking-widest text-cyan-300 transition-all duration-300 hover:border-cyan-300 hover:bg-cyan-500/20 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles size={16} />
            {saving ? '保存中...' : isOnboarding ? '完成同步，选择世界' : '保存用户资料'}
          </button>
        </form>
      </div>
    </motion.div>
  );

  if (!isOnboarding) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-space-950 p-4 md:p-6">
      <ParticleBackground />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(6,182,212,0.03) 1px,transparent 1px),' +
            'linear-gradient(90deg,rgba(6,182,212,0.03) 1px,transparent 1px)',
          backgroundSize: '60px 60px',
          zIndex: 1,
        }}
      />
      <div className="relative z-10 mb-4 text-center">
        <div
          className="font-orbitron text-3xl font-black tracking-widest text-cyan-400 md:text-4xl"
          style={{ textShadow: '0 0 34px rgba(6,182,212,0.8)' }}
        >
          TIME ECHO
        </div>
        <div className="mt-1 font-mono text-xs tracking-[0.5em] text-slate-500">时间回声</div>
      </div>
      <div className="relative z-10 flex min-h-[calc(100vh-96px)] items-center justify-center">
        {content}
      </div>
    </div>
  );
}

function CompactNote({ title, text }: { title: string; text: string }) {
  return (
    <div className="border border-space-700 bg-space-800/45 px-3 py-2.5">
      <div className="font-mono text-[11px] text-cyan-300">{title}</div>
      <div className="mt-1 leading-5 text-slate-500">{text}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="block">
      <span className="mb-1.5 block font-mono text-xs text-slate-400">{label}</span>
      {children}
    </div>
  );
}

function QuickChips({ options, onPick }: { options: string[]; onPick: (option: string) => void }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {options.map(option => (
        <button
          key={option}
          type="button"
          onClick={() => onPick(option)}
          className="border border-cyan-500/15 bg-space-800/60 px-2 py-0.5 text-[11px] text-slate-400 transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
