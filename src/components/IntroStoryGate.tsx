import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Sparkles } from 'lucide-react';
import { ParticleBackground } from './ParticleBackground';

interface Props {
  onComplete: () => void;
}

type ChoiceId = 'collapse' | 'archives' | 'nonhuman';

const INTRO_LINES = [
  '信号稳定了。你好，旅人。现在是 2847 年，人类文明已经在一场被称为“时间回声”的灾难后坍缩。',
  '那一天，全球量子网络同时接收到来自时间起点的异常信号。绝大多数上传意识被撕裂成碎片，城市沉入静默，只剩少数残魂还保持清醒。',
  '我叫艾希，是量子废墟中的档案库守护者。这里保存着人类最后的记忆，也保存着那些还没来得及被理解的过去。',
  '我们启动“回声世界”，不是为了逃离废墟，而是为了重新读取文明留下的痕迹。未来的残响、创世的神话、旧书里的狐鬼夜谈，还有海洋深处不属于人类的梦，都可能告诉我们：人类究竟失去了什么。',
];

const CHOICES: Array<{ id: ChoiceId; label: string; response: string }> = [
  {
    id: 'collapse',
    label: '文明为何坍缩',
    response:
      '时间回声不是普通灾难。它像一把钥匙，强行打开了所有意识与时间之间的门，而大多数灵魂承受不了那一瞬间的重量。',
  },
  {
    id: 'archives',
    label: '旧文明为什么重要',
    response:
      '因为文明不只存在于技术里。诗文、志怪、梦、恐惧、爱与告别，都是人类曾经活过的证据。',
  },
  {
    id: 'nonhuman',
    label: '非人类回声是什么',
    response:
      '人类并不是唯一会记忆的生命。鲸歌、迁徙、海流与沉没的骨骸，也在用另一种方式保存世界。',
  },
];

const FINAL_LINE =
  '现在，时间回声档案库已经为你打开。选择一个分支吧，旅人。每一个世界，都是一枚仍在发光的文明碎片。';

export function IntroStoryGate({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [choiceResponse, setChoiceResponse] = useState('');

  const isChoiceStep = step === INTRO_LINES.length;
  const isResponseStep = step === INTRO_LINES.length + 1;
  const isFinalStep = step === INTRO_LINES.length + 2;
  const currentText = isResponseStep ? choiceResponse : isFinalStep ? FINAL_LINE : INTRO_LINES[step];

  function advance() {
    if (step < INTRO_LINES.length) {
      setStep(prev => prev + 1);
      return;
    }
    if (isResponseStep) {
      setStep(prev => prev + 1);
      return;
    }
    if (isFinalStep) {
      onComplete();
    }
  }

  function selectChoice(response: string) {
    setChoiceResponse(response);
    setStep(INTRO_LINES.length + 1);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-space-950 p-4 md:p-8">
      <ParticleBackground />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 18%, rgba(6,182,212,0.18), transparent 30%), linear-gradient(rgba(6,182,212,0.025) 1px,transparent 1px), linear-gradient(90deg,rgba(6,182,212,0.025) 1px,transparent 1px)',
          backgroundSize: 'auto, 60px 60px, 60px 60px',
        }}
      />

      <main className="relative z-10 flex min-h-[calc(100vh-4rem)] items-end justify-center pb-8 md:items-center md:pb-0">
        <div className="w-full max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-5 flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-lg font-semibold text-cyan-200 shadow-[0_0_24px_rgba(6,182,212,0.22)]">
              艾
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-100">艾希 · 量子残魂</div>
              <div className="font-mono text-xs tracking-widest text-cyan-400/80">2847 / TIME ECHO ARCHIVE</div>
            </div>
          </motion.div>

          <motion.section
            key={step}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32 }}
            className="border border-cyan-500/25 bg-space-900/90 p-5 shadow-[0_0_40px_rgba(6,182,212,0.12)] backdrop-blur-xl md:p-7"
          >
            {isChoiceStep ? (
              <>
                <div className="mb-4 flex items-center gap-2 font-mono text-xs tracking-widest text-cyan-300">
                  <Sparkles size={15} />
                  档案库询问
                </div>
                <p className="mb-5 text-base leading-8 text-slate-200">
                  在进入档案库前，你想先了解哪一种回声？
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  {CHOICES.map(choice => (
                    <button
                      key={choice.id}
                      onClick={() => selectChoice(choice.response)}
                      className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-4 py-3 text-left text-sm text-cyan-100 transition-all hover:border-cyan-300/70 hover:bg-cyan-500/20 hover:shadow-[0_0_18px_rgba(6,182,212,0.18)]"
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="min-h-[7rem] text-base leading-8 text-slate-200 md:text-lg md:leading-9">
                  {currentText}
                </p>
                <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                  <span className="font-mono text-xs text-slate-600">
                    {isFinalStep ? 'ARCHIVE OPEN' : `SYNC ${String(step + 1).padStart(2, '0')}`}
                  </span>
                  <button
                    onClick={advance}
                    className="flex items-center gap-2 rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-4 py-2 font-orbitron text-xs font-semibold tracking-widest text-cyan-300 transition-all hover:border-cyan-300 hover:bg-cyan-500/20"
                  >
                    {isFinalStep ? '进入档案库' : '继续'}
                    <ChevronRight size={15} />
                  </button>
                </div>
              </>
            )}
          </motion.section>
        </div>
      </main>
    </div>
  );
}
