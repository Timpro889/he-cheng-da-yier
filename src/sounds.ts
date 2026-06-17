// 音效管理
const soundCache: Record<string, HTMLAudioElement> = {};

function playSound(src: string, volume: number = 0.5) {
  try {
    // 复用或创建新的 Audio 实例
    let audio = soundCache[src];
    if (!audio) {
      audio = new Audio(src);
      soundCache[src] = audio;
    }
    audio.volume = volume;
    audio.currentTime = 0;
    audio.play().catch(() => {
      // 用户未交互前无法播放，忽略错误
    });
  } catch {
    // 忽略音效播放错误
  }
}

export function playDropSound() {
  playSound('/sounds/drop.mp3', 0.4);
}

export function playMergeYierSound() {
  playSound('/sounds/merge-yier.mp3', 0.5);
}

export function playMergeBibuSound() {
  playSound('/sounds/merge-bibu.mp3', 0.5);
}

export function playWinSound() {
  playSound('/sounds/win.mp3', 0.6);
}

export function playGameOverSound() {
  playSound('/sounds/gameover.mp3', 0.5);
}
