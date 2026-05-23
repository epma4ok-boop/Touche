// 3 heartbeats + reveal + dismiss — WebAudio only, no files
let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}
function thump(ctx: AudioContext, freq: number, gain: number, t: number, dur: number) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type = "lowpass"; f.frequency.setValueAtTime(220, t); f.frequency.exponentialRampToValueAtTime(55, t + dur);
  osc.type = "sine"; osc.frequency.setValueAtTime(freq, t); osc.frequency.exponentialRampToValueAtTime(freq * 0.38, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.014); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(f); f.connect(g); g.connect(ctx.destination);
  osc.start(t); osc.stop(t + dur + 0.04);
}

export function playHeartbeat(onlyOnce = false): void {
  try {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime + 0.05;
    // Beat 1 — lub-dub
    thump(ctx, 70, 0.88, now,        0.18);
    thump(ctx, 88, 0.52, now + 0.22, 0.14);
    if (onlyOnce) return;
    // Beat 2 — lub-dub
    thump(ctx, 70, 0.84, now + 0.85, 0.18);
    thump(ctx, 88, 0.48, now + 1.07, 0.14);
    // Beat 3 — lub-dub (slightly softer, fading out)
    thump(ctx, 70, 0.70, now + 1.70, 0.18);
    thump(ctx, 88, 0.38, now + 1.92, 0.14);
  } catch {}
}

export function playReveal(): void {
  try {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime + 0.02;
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = "sine"; osc.frequency.setValueAtTime(370, now); osc.frequency.linearRampToValueAtTime(510, now + 0.32);
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.17, now + 0.08); g.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
    osc.connect(g); g.connect(ctx.destination); osc.start(now); osc.stop(now + 0.72);
  } catch {}
}

export function playDismiss(): void {
  try {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime + 0.02;
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = "sine"; osc.frequency.setValueAtTime(330, now); osc.frequency.exponentialRampToValueAtTime(210, now + 0.28);
    g.gain.setValueAtTime(0.11, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
    osc.connect(g); g.connect(ctx.destination); osc.start(now); osc.stop(now + 0.34);
  } catch {}
}

export default function useSensualSound() { return { play: playReveal }; }
