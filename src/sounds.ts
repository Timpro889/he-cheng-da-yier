// 音效管理（Web Audio API 版）
//
// 为什么不用原来的 new Audio()：
// 1. Audio 从未被「解锁」，第一次播放恰好发生在唯一的那个用户手势窗口里，一旦失败后面全被拦；
// 2. 单例复用 + seek 回 0，连续合成时后一个音效会打断前一个；
// 3. 错误被静默吞掉，线上无从排查。
// 这里改成：预解码成 AudioBuffer + 首次手势解锁 + 多路叠加播放。

const BASE = import.meta.env.BASE_URL ?? '/';

export const SOUND_FILES = {
  drop: `${BASE}sounds/drop.mp3`,
  mergeYier: `${BASE}sounds/merge-yier.mp3`,
  mergeBibu: `${BASE}sounds/merge-bibu.mp3`,
  win: `${BASE}sounds/win.mp3`,
  gameover: `${BASE}sounds/gameover.mp3`,
} as const;

export type SoundName = keyof typeof SOUND_FILES;

const MUTE_KEY = 'yibugame-muted';

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = localStorage.getItem(MUTE_KEY) === '1';
const buffers = new Map<SoundName, AudioBuffer>();
const failed = new Set<SoundName>();
const listeners = new Set<(m: boolean) => void>();
let unlockBound = false;

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  if (!AC) {
    console.warn('[sounds] 当前浏览器不支持 Web Audio API，音效将不可用');
    return null;
  }
  try {
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : 1;
    masterGain.connect(ctx.destination);
  } catch (e) {
    console.warn('[sounds] AudioContext 创建失败', e);
    return null;
  }
  return ctx;
}

async function load(name: SoundName): Promise<AudioBuffer | undefined> {
  if (buffers.has(name)) return buffers.get(name);
  if (failed.has(name)) return undefined;

  const c = getCtx();
  if (!c) return undefined;

  try {
    const res = await fetch(SOUND_FILES[name]);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${SOUND_FILES[name]}`);
    const buf = await c.decodeAudioData(await res.arrayBuffer());
    buffers.set(name, buf);
    return buf;
  } catch (e) {
    failed.add(name);
    console.warn(`[sounds] 加载失败: ${SOUND_FILES[name]}`, e);
    return undefined;
  }
}

/**
 * iOS Safari / 微信内核要求：AudioContext 必须在真实用户手势的同步调用栈里
 * resume 一次，否则后续所有播放都会被静默拦截。
 */
export function unlockAudio(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') {
    c.resume().catch(e => console.warn('[sounds] resume 失败', e));
  }
  // 播放一个 1 采样的静音 buffer，彻底把音频通道「捅开」
  try {
    const src = c.createBufferSource();
    src.buffer = c.createBuffer(1, 1, c.sampleRate);
    src.connect(c.destination);
    src.start(0);
  } catch {
    /* 忽略 */
  }
}

/** 预加载全部音效 + 绑定首次交互解锁。在组件挂载时调用一次。 */
export function preloadSounds(): void {
  getCtx();
  (Object.keys(SOUND_FILES) as SoundName[]).forEach(load);

  if (unlockBound) return;
  unlockBound = true;
  const events: (keyof WindowEventMap)[] = ['pointerdown', 'touchstart', 'keydown'];
  const handler = () => {
    unlockAudio();
    events.forEach(e => window.removeEventListener(e, handler));
  };
  events.forEach(e => window.addEventListener(e, handler, { passive: true }));
}

function play(name: SoundName, volume: number): void {
  if (muted) return;
  const c = getCtx();
  if (!c || !masterGain) return;

  if (c.state === 'suspended') {
    c.resume().catch(() => {});
  }

  load(name).then(buf => {
    if (!buf || !c || muted) return;
    try {
      const src = c.createBufferSource();
      src.buffer = buf;
      const gain = c.createGain();
      gain.gain.value = volume;
      src.connect(gain);
      gain.connect(masterGain!);
      src.start(0);
    } catch (e) {
      console.warn(`[sounds] 播放失败: ${name}`, e);
    }
  });
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  localStorage.setItem(MUTE_KEY, next ? '1' : '0');
  if (masterGain && ctx) {
    masterGain.gain.setTargetAtTime(next ? 0 : 1, ctx.currentTime, 0.01);
  }
  if (!next) unlockAudio();
  listeners.forEach(fn => fn(muted));
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

export function subscribeMuted(fn: (m: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function playDropSound(): void {
  play('drop', 0.4);
}

export function playMergeYierSound(): void {
  play('mergeYier', 0.5);
}

export function playMergeBibuSound(): void {
  play('mergeBibu', 0.5);
}

export function playWinSound(): void {
  play('win', 0.6);
}

export function playGameOverSound(): void {
  play('gameover', 0.5);
}
