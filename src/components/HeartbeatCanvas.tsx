import { useEffect, useRef, useCallback } from "react";

export type HeartbeatColor = { r: number; g: number; b: number };

interface HeartbeatCanvasProps {
  onHoldComplete: () => void;
  isCasting: boolean;
  color: HeartbeatColor;
  hintText: string;
  holdDuration?: number;
  baseRScale?: number;
  bgColor?: string;
}

export default function HeartbeatCanvas({
  onHoldComplete,
  isCasting,
  color,
  hintText,
  holdDuration = 2600,
  baseRScale = 0.20,
  bgColor = "#0d0610",
}: HeartbeatCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const holdStartRef = useRef<number | null>(null);
  const holdActiveRef = useRef(false);
  const firedRef = useRef(false);
  const castingRef = useRef(isCasting);
  const colorRef = useRef(color);
  const hintRef = useRef(hintText);
  const onHoldRef = useRef(onHoldComplete);
  const bgColorRef = useRef(bgColor);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const beatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstRef = useRef(0);

  useEffect(() => { castingRef.current = isCasting; }, [isCasting]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { hintRef.current = hintText; }, [hintText]);
  useEffect(() => { onHoldRef.current = onHoldComplete; }, [onHoldComplete]);
  useEffect(() => { bgColorRef.current = bgColor; }, [bgColor]);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const playBeat = useCallback((intensity: number) => {
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;
      const o1 = ctx.createOscillator(), g1 = ctx.createGain();
      o1.connect(g1); g1.connect(ctx.destination);
      o1.frequency.setValueAtTime(58, now);
      o1.frequency.exponentialRampToValueAtTime(28, now + 0.13);
      g1.gain.setValueAtTime(0, now);
      g1.gain.linearRampToValueAtTime(0.30 * intensity, now + 0.012);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      o1.start(now); o1.stop(now + 0.16);
      const o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o2.connect(g2); g2.connect(ctx.destination);
      o2.frequency.setValueAtTime(78, now + 0.085);
      o2.frequency.exponentialRampToValueAtTime(36, now + 0.23);
      g2.gain.setValueAtTime(0, now + 0.085);
      g2.gain.linearRampToValueAtTime(0.20 * intensity, now + 0.095);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      o2.start(now + 0.085); o2.stop(now + 0.26);
    } catch {}
  }, [getAudioCtx]);

  const stopBeats = useCallback(() => {
    if (beatTimerRef.current) { clearTimeout(beatTimerRef.current); beatTimerRef.current = null; }
  }, []);

  const startBeats = useCallback(() => {
    stopBeats();
    let elapsed = 0;
    const tick = () => {
      if (!holdActiveRef.current) return;
      const progress = Math.min(1, elapsed / holdDuration);
      const bpm = 68 + progress * 92;
      const interval = 60000 / bpm;
      elapsed += interval;
      playBeat(0.55 + progress * 0.45);
      if (holdActiveRef.current) beatTimerRef.current = setTimeout(tick, interval);
    };
    playBeat(0.55);
    beatTimerRef.current = setTimeout(tick, 60000 / 68);
  }, [holdDuration, playBeat, stopBeats]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (now: number) => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const cx = w / 2;
      const cy = h / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = bgColorRef.current;
      ctx.fillRect(0, 0, w, h);

      const holdProgress = holdStartRef.current !== null
        ? Math.min(1, (now - holdStartRef.current) / holdDuration) : 0;

      const { r, g, b } = colorRef.current;
      const bpm = holdActiveRef.current ? 68 + holdProgress * 92 : 68;
      const beatPeriod = 60 / bpm;
      const t2 = now / 1000;
      const beatPhase = (t2 % beatPeriod) / beatPeriod;
      const beatEnv = beatPhase < 0.09
        ? beatPhase / 0.09
        : Math.max(0, 1 - (beatPhase - 0.09) / 0.52);

      if (burstRef.current > 0) burstRef.current = Math.max(0, burstRef.current - 0.04);
      const burst = burstRef.current;

      const baseR = Math.min(w, h) * baseRScale;
      const ringCount = 6;

      for (let i = ringCount - 1; i >= 0; i--) {
        const ringPhase = i / ringCount;
        const spreadPhase = ((t2 / beatPeriod - ringPhase) % 1 + 1) % 1;
        const maxRing = baseR + (i + 1) * (Math.min(w, h) * 0.085) + holdProgress * Math.min(w, h) * 0.055;
        const minRing = baseR * (0.75 - i * 0.04);
        const radius = minRing + spreadPhase * (maxRing - minRing);
        const baseAlpha = (1 - spreadPhase) * (0.22 + holdProgress * 0.30) * (1 + beatEnv * 0.45);
        const alpha = Math.min(0.90, baseAlpha + burst * (1 - spreadPhase) * 0.45);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = (1.0 + holdProgress * 1.4 + beatEnv * 0.9) * (1 - i * 0.08);
        ctx.stroke();
      }

      const glowR = baseR * (0.9 + beatEnv * 0.20 + holdProgress * 0.32 + burst * 0.45);
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      const ga = 0.14 + holdProgress * 0.22 + beatEnv * 0.12 + burst * 0.30;
      glow.addColorStop(0, `rgba(${r},${g},${b},${ga})`);
      glow.addColorStop(0.5, `rgba(${r},${g},${b},${ga * 0.3})`);
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fill();

      const dotR = baseR * (0.26 + beatEnv * 0.07 + holdProgress * 0.09 + burst * 0.18);
      const dotG = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR);
      dotG.addColorStop(0, `rgba(${r},${g},${b},${0.70 + holdProgress * 0.28 + beatEnv * 0.12})`);
      dotG.addColorStop(0.6, `rgba(${r},${g},${b},${0.28 + holdProgress * 0.18})`);
      dotG.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = dotG;
      ctx.beginPath();
      ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
      ctx.fill();

      if (holdActiveRef.current && holdProgress > 0 && holdProgress < 1) {
        const arcR = baseR * 0.52;
        ctx.beginPath();
        ctx.arc(cx, cy, arcR, -Math.PI / 2, -Math.PI / 2 + holdProgress * Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},0.80)`;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, arcR, -Math.PI / 2 + holdProgress * Math.PI * 2, -Math.PI / 2 + Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},0.12)`;
        ctx.lineWidth = 2;
        ctx.lineCap = "butt";
        ctx.stroke();
      }

      const hintAlpha = holdActiveRef.current
        ? Math.max(0, 1 - holdProgress * 2.5) : 0.55;
      if (hintAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = hintAlpha;
        const fs = Math.min(12, Math.max(9, w * 0.026));
        ctx.font = `400 ${fs}px 'Plus Jakarta Sans','DM Sans',sans-serif`;
        ctx.fillStyle = `rgba(${r},${g},${b},1)`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(hintRef.current.toUpperCase(), cx, cy + Math.min(w, h) * 0.38);
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [holdDuration, baseRScale]);

  const handlePressStart = useCallback(() => {
    if (castingRef.current) return;
    holdActiveRef.current = true;
    firedRef.current = false;
    holdStartRef.current = performance.now();
    startBeats();
    const timer = setTimeout(() => {
      if (holdActiveRef.current && !firedRef.current) {
        firedRef.current = true;
        burstRef.current = 1.0;
        stopBeats();
        try {
          const ac = getAudioCtx();
          const now = ac.currentTime;
          const o = ac.createOscillator(), g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          o.frequency.setValueAtTime(52, now);
          o.frequency.exponentialRampToValueAtTime(20, now + 0.28);
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.48, now + 0.015);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
          o.start(now); o.stop(now + 0.33);
        } catch {}
        onHoldRef.current();
      }
    }, holdDuration);
    (holdActiveRef as any)._timer = timer;
  }, [startBeats, stopBeats, holdDuration, getAudioCtx]);

  const handlePressEnd = useCallback(() => {
    holdActiveRef.current = false;
    holdStartRef.current = null;
    stopBeats();
    if ((holdActiveRef as any)._timer) {
      clearTimeout((holdActiveRef as any)._timer);
      (holdActiveRef as any)._timer = null;
    }
  }, [stopBeats]);

  return (
    <div
      style={{ position: "relative", width: "100%", height: "100%", userSelect: "none" }}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={(e) => { e.preventDefault(); handlePressStart(); }}
      onTouchEnd={(e) => { e.preventDefault(); handlePressEnd(); }}
      onTouchCancel={handlePressEnd}
    >
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", touchAction: "none" }}
      />
    </div>
  );
}
