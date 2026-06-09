export type InsightKeyClickVariant = 'letter' | 'modifier' | 'delete' | 'return';

const SOUNDS_STORAGE_KEY = 'insight-vk-sounds';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) {
    audioContext = new AudioContextClass();
  }
  return audioContext;
}

function soundsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(SOUNDS_STORAGE_KEY);
    if (stored === 'off') return false;
  } catch {
    /* ignore */
  }
  return true;
}

/** Resume AudioContext on first user gesture (required on iOS). */
export async function resumeInsightKeyboardAudio(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      /* ignore */
    }
  }
}

const VARIANT_FREQ: Record<InsightKeyClickVariant, number> = {
  letter: 920,
  modifier: 720,
  delete: 480,
  return: 640,
};

const VARIANT_GAIN: Record<InsightKeyClickVariant, number> = {
  letter: 0.08,
  modifier: 0.07,
  delete: 0.06,
  return: 0.11,
};

const VARIANT_DURATION: Record<InsightKeyClickVariant, number> = {
  letter: 0.028,
  modifier: 0.032,
  delete: 0.035,
  return: 0.04,
};

/** Subtle iOS-style keyboard tick via Web Audio. Fails silently if unavailable. */
export function playInsightKeyClick(variant: InsightKeyClickVariant = 'letter'): void {
  if (!soundsEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'running') return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const duration = VARIANT_DURATION[variant];
    const now = ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(VARIANT_FREQ[variant], now);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(120, VARIANT_FREQ[variant] * 0.55),
      now + duration,
    );

    gain.gain.setValueAtTime(VARIANT_GAIN[variant], now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  } catch {
    /* ignore */
  }
}
