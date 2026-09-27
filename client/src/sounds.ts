import { useEffect, useRef } from 'react';
import type { RoomView } from '../../shared/types';
import { useCountdown } from './useCountdown';

const MUTE_KEY = 'stopia:muted';
let ctx: AudioContext | null = null;
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
})();

export const isMuted = () => muted;

export function setMuted(m: boolean): void {
  muted = m;
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0');
  } catch {
    // ignora
  }
}

/** Navegadores só liberam áudio após um gesto do usuário. */
export function unlockAudio(): void {
  ctx ??= new AudioContext();
  void ctx.resume();
}
if (typeof window !== 'undefined') window.addEventListener('pointerdown', unlockAudio, { once: true });

function tone(freq: number, ms: number, delayMs = 0, type: OscillatorType = 'sine', gain = 0.15): void {
  if (muted) return;
  ctx ??= new AudioContext();
  const t = ctx.currentTime + delayMs / 1000;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + ms / 1000);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + ms / 1000);
}

export const sfx = {
  draw: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 120, i * 90, 'triangle')),
  tick: () => tone(880, 60, 0, 'square', 0.05),
  stop: () => {
    tone(220, 250, 0, 'sawtooth', 0.12);
    tone(165, 350, 120, 'sawtooth', 0.12);
  },
  good: () => {
    tone(660, 120);
    tone(990, 160, 100);
  },
  bad: () => tone(196, 220, 0, 'square', 0.08),
  end: () => [523, 659, 784, 659, 1047].forEach((f, i) => tone(f, 180, i * 140, 'triangle')),
};

export function useSounds(view: RoomView, offset: number): void {
  const prevPhase = useRef(view.phase);
  useEffect(() => {
    const from = prevPhase.current;
    prevPhase.current = view.phase;
    if (from === view.phase) return;
    if (view.phase === 'drawing') sfx.draw();
    else if (view.phase === 'validating') sfx.stop();
    else if (view.phase === 'final') sfx.end();
  }, [view.phase]);

  const reviewKey = view.review ? `${view.round}-${view.review.categoryIndex}` : '';
  useEffect(() => {
    const mine = view.review?.groups.find((g) => g.mine);
    if (mine) (mine.effectiveValid ? sfx.good : sfx.bad)();
  }, [reviewKey]);

  const left = useCountdown(view.phase === 'answering' ? view.phaseEndsAt : null, offset);
  const secs = Math.ceil(left / 1000);
  useEffect(() => {
    if (view.phase === 'answering' && secs > 0 && secs <= 5) sfx.tick();
  }, [secs]);
}
