// src/hooks/useSensualSound.ts
// Beautiful heartbeat sound using WebAudio API — no files needed

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playThump(ctx: AudioContext, freq: number, gain: number, startTime: number, duration: number) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(200, startTime);
  filter.frequency.exponentialRampToValueAtTime(60, startTime + duration);

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, startTime);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.4, startTime + duration);

  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.012);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/** Play a single lub-dub heartbeat */
export function playHeartbeat(onlyOnce = false): void {
  try {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime + 0.05;

    // Lub — deep, strong
    playThump(ctx, 72, 0.90, now, 0.18);
    // Dub — slightly higher, softer, delayed
    playThump(ctx, 90, 0.55, now + 0.22, 0.14);

    if (!onlyOnce) {
      // Second beat after ~0.85s for a resting heart rhythm
      setTimeout(() => {
        try {
          const t = ctx.currentTime + 0.02;
          playThump(ctx, 72, 0.85, t, 0.18);
          playThump(ctx, 90, 0.50, t + 0.22, 0.14);
        } catch {}
      }, 860);
    }
  } catch {}
}

/** Play a reveal "bloom" sound — soft rising tone */
export function playReveal(): void {
  try {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime + 0.02;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const reverb = ctx.createConvolver();

    osc.type = "sine";
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.linearRampToValueAtTime(520, now + 0.35);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.75);
  } catch {}
}

/** Play a soft dismiss/close sound */
export function playDismiss(): void {
  try {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime + 0.02;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.3);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch {}
}

// Legacy default export for backward compatibility
export default function useSensualSound() {
  return { play: playReveal };
}
