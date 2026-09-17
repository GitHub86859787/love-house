/**
 * 8-bit 音效：全部用 Web Audio 振荡器合成，不用外部音频文件。
 * 首次用户交互时创建 AudioContext；设置里可关。
 */
export type SoundName = 'click' | 'heartUp' | 'giftHit' | 'giftBad' | 'milestone' | 'achievement' | 'done' | 'error' | 'pop';

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

interface NoteSpec {
  freq: number;
  /** 起始时间（秒，相对） */
  at: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  /** 频率滑到 */
  slideTo?: number;
}

function playNotes(notes: NoteSpec[]) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime;
  for (const n of notes) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = n.type ?? 'square';
    osc.frequency.setValueAtTime(n.freq, t0 + n.at);
    if (n.slideTo) osc.frequency.linearRampToValueAtTime(n.slideTo, t0 + n.at + n.dur);
    const vol = n.gain ?? 0.08;
    g.gain.setValueAtTime(0, t0 + n.at);
    g.gain.linearRampToValueAtTime(vol, t0 + n.at + 0.005);
    g.gain.setValueAtTime(vol, t0 + n.at + n.dur * 0.7);
    g.gain.linearRampToValueAtTime(0, t0 + n.at + n.dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0 + n.at);
    osc.stop(t0 + n.at + n.dur + 0.01);
  }
}

const LIB: Record<SoundName, NoteSpec[]> = {
  click: [{ freq: 880, at: 0, dur: 0.04, gain: 0.05 }],
  pop: [{ freq: 520, at: 0, dur: 0.06, slideTo: 780, type: 'triangle', gain: 0.07 }],
  heartUp: [
    { freq: 660, at: 0, dur: 0.07 },
    { freq: 880, at: 0.07, dur: 0.07 },
    { freq: 1320, at: 0.14, dur: 0.12 },
  ],
  giftHit: [
    { freq: 523, at: 0, dur: 0.06 },
    { freq: 659, at: 0.06, dur: 0.06 },
    { freq: 784, at: 0.12, dur: 0.06 },
    { freq: 1047, at: 0.18, dur: 0.16 },
  ],
  giftBad: [
    { freq: 330, at: 0, dur: 0.12, slideTo: 220 },
    { freq: 220, at: 0.14, dur: 0.2, slideTo: 150 },
  ],
  milestone: [
    { freq: 523, at: 0, dur: 0.1 },
    { freq: 659, at: 0.1, dur: 0.1 },
    { freq: 784, at: 0.2, dur: 0.1 },
    { freq: 1047, at: 0.3, dur: 0.25 },
    { freq: 784, at: 0.55, dur: 0.1 },
    { freq: 1047, at: 0.65, dur: 0.35 },
  ],
  achievement: [
    { freq: 784, at: 0, dur: 0.08, type: 'triangle' },
    { freq: 988, at: 0.08, dur: 0.08, type: 'triangle' },
    { freq: 1175, at: 0.16, dur: 0.08, type: 'triangle' },
    { freq: 1568, at: 0.24, dur: 0.3, type: 'triangle' },
  ],
  done: [
    { freq: 740, at: 0, dur: 0.06 },
    { freq: 1109, at: 0.06, dur: 0.12 },
  ],
  error: [{ freq: 200, at: 0, dur: 0.15, type: 'sawtooth', gain: 0.05 }],
};

export function play(name: SoundName) {
  try {
    playNotes(LIB[name]);
  } catch {
    // 音频不可用时静默
  }
}
