import { useRef, useCallback } from "react";

export function useSensualSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  function getCtx(): AudioContext {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }

  // Warm low hum + rising shimmer on tap
  const playTap = useCallback(() => {
    try {
      const ac = getCtx();
      const now = ac.currentTime;

      const drone = ac.createOscillator();
      const droneGain = ac.createGain();
      drone.type = "sine";
      drone.frequency.setValueAtTime(52, now);
      drone.frequency.linearRampToValueAtTime(42, now + 1.2);
      droneGain.gain.setValueAtTime(0, now);
      droneGain.gain.linearRampToValueAtTime(0.22, now + 0.07);
      droneGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
      drone.connect(droneGain);
      droneGain.connect(ac.destination);
      drone.start(now);
      drone.stop(now + 1.4);

      const shimmer = ac.createOscillator();
      const shimmerGain = ac.createGain();
      shimmer.type = "sine";
      shimmer.frequency.setValueAtTime(180, now);
      shimmer.frequency.exponentialRampToValueAtTime(520, now + 1.2);
      shimmerGain.gain.setValueAtTime(0, now);
      shimmerGain.gain.linearRampToValueAtTime(0.09, now + 0.12);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
      const shimmer2 = ac.createOscillator();
      shimmer2.type = "sine";
      shimmer2.frequency.setValueAtTime(183, now);
      shimmer2.frequency.exponentialRampToValueAtTime(524, now + 1.2);
      shimmer2.connect(shimmerGain);
      shimmer.connect(shimmerGain);
      shimmerGain.connect(ac.destination);
      shimmer.start(now);
      shimmer2.start(now);
      shimmer.stop(now + 1.3);
      shimmer2.stop(now + 1.3);

      const thud = ac.createOscillator();
      const thudGain = ac.createGain();
      thud.type = "sine";
      thud.frequency.setValueAtTime(80, now);
      thud.frequency.exponentialRampToValueAtTime(28, now + 0.16);
      thudGain.gain.setValueAtTime(0.30, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
      thud.connect(thudGain);
      thudGain.connect(ac.destination);
      thud.start(now);
      thud.stop(now + 0.20);
    } catch (_) {}
  }, []);

  // Warm bell-like reveal
  const playReveal = useCallback(() => {
    try {
      const ac = getCtx();
      const now = ac.currentTime;
      const freqs = [440, 660, 880];
      freqs.forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.97, now + 1.4);
        const vol = [0.12, 0.06, 0.03][i];
        const delay = i * 0.05;
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(vol, now + delay + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 2.0);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 2.0);
      });
    } catch (_) {}
  }, []);

  // Soft click when switching category orb
  const playSwitch = useCallback((targetFreq: number = 440) => {
    try {
      const ac = getCtx();
      const now = ac.currentTime;
      [targetFreq * 0.5, targetFreq].forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq * 0.92, now + i * 0.06);
        osc.frequency.linearRampToValueAtTime(freq, now + i * 0.06 + 0.10);
        gain.gain.setValueAtTime(0, now + i * 0.06);
        gain.gain.linearRampToValueAtTime(0.07, now + i * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.30);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.30);
      });
    } catch (_) {}
  }, []);

  return { playTap, playReveal, playSwitch };
}
