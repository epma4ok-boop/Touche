import { useEffect, useRef, useCallback } from "react";

export type HeartbeatColor = { r: number; g: number; b: number };

interface HeartbeatCanvasProps {
  onHoldComplete: () => void;
  isCasting: boolean;
  color: HeartbeatColor;
  taskText: string;
  revealProgress: number;
  hintText: string;
  holdDuration?: number; // ms, default 2600
}

export default function HeartbeatCanvas({
  onHoldComplete,
  isCasting,
  color,
  taskText,
  revealProgress,
  hintText,
  holdDuration = 2600,
}: HeartbeatCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const holdStartRef = useRef<number | null>(null);
  const holdActiveRef = useRef(false);
  const firedRef = useRef(false);
  const castingRef = useRef(isCasting);
  const colorRef = useRef(color);
  const textRef = useRef({ text: taskText, reveal: revealProgress, hint: hintText });
  const onHoldRef = useRef(onHoldComplete);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const beatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const burstRef = useRef(0); // flash burst on reveal

  useEffect(() => { castingRef.current = isCasting; }, [isCasting]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { textRef.current = { text: taskText, reveal: revealProgress, hint: hintText }; }, [taskText, revealProgress, hintText]);
  useEffect(() => { onHoldRef.current = onHoldComplete; }, [onHoldComplete]);

  // ── Heartbeat sound via Web Audio API ─────────────────────────────────────
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

      // "lub" — low thump
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.setValueAtTime(60, now);
      osc1.frequency.exponentialRampToValueAtTime(30, now + 0.12);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.28 * intensity, now + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // "dub" — slight higher echo 80ms later
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.setValueAtTime(80, now + 0.08);
      osc2.frequency.exponentialRampToValueAtTime(38, now + 0.22);
      gain2.gain.setValueAtTime(0, now + 0.08);
      gain2.gain.linearRampToValueAtTime(0.18 * intensity, now + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.25);
    } catch {}
  }, [getAudioCtx]);

  const stopBeats = useCallback(() => {
    if (beatIntervalRef.current) {
      clearInterval(beatIntervalRef.current);
      beatIntervalRef.current = null;
    }
  }, []);

  const startBeats = useCallback(() => {
    stopBeats();
    let elapsed = 0;
    // BPM ramps from 70 → 160 over holdDuration ms
    const tick = () => {
      if (!holdActiveRef.current) return;
      const progress = Math.min(1, elapsed / holdDuration);
      const bpm = 70 + progress * 90; // 70→160
      const interval = 60000 / bpm;
      elapsed += interval;
      const intensity = 0.6 + progress * 0.4;
      playBeat(intensity);
      if (holdActiveRef.current) {
        beatIntervalRef.current = setTimeout(tick, interval);
      }
    };
    playBeat(0.6);
    beatIntervalRef.current = setTimeout(tick, 60000 / 70);
  }, [holdDuration, playBeat, stopBeats]);

  // ── Canvas render loop ─────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    let startTime = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (now: number) => {
      const t = (now - startTime) / 1000;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const cx = w / 2;
      const cy = h / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Background — warm cream
      ctx.fillStyle = "#fdf8f5";
      ctx.fillRect(0, 0, w, h);

      // Hold progress 0→1
      const holdProgress = holdStartRef.current !== null
        ? Math.min(1, (now - holdStartRef.current) / holdDuration)
        : 0;

      const { r, g, b } = colorRef.current;

      // Base BPM: 70 at rest → 160 when fully held
      const bpm = holdActiveRef.current ? 70 + holdProgress * 90 : 70;
      const beatPeriod = 60 / bpm;
      // Beat phase: 0→1 within each beat cycle
      const beatPhase = (t % beatPeriod) / beatPeriod;
      // Beat envelope: sharp attack, slower decay
      const beatEnv = beatPhase < 0.08
        ? beatPhase / 0.08
        : Math.max(0, 1 - (beatPhase - 0.08) / 0.55);

      // Burst on reveal
      if (burstRef.current > 0) burstRef.current = Math.max(0, burstRef.current - 0.035);
      const burst = burstRef.current;

      // ── Rings ──────────────────────────────────────────────────────────────
      const ringCount = 5;
      const baseRadius = Math.min(w, h) * 0.13;

      for (let i = ringCount - 1; i >= 0; i--) {
        const ringPhase = (i / ringCount);
        // Each ring radiates outward; delay by ring index
        const spreadPhase = ((t / beatPeriod - ringPhase) % 1 + 1) % 1;
        const maxR = baseRadius + (i + 1) * (Math.min(w, h) * 0.09) + holdProgress * Math.min(w, h) * 0.06;
        const minR = baseRadius * (0.8 - i * 0.05);
        const radius = minR + spreadPhase * (maxR - minR);

        // Opacity: strong near center, fades as it spreads, pulses with beat
        const baseAlpha = (1 - spreadPhase) * (0.18 + holdProgress * 0.22) * (1 + beatEnv * 0.4);
        const burstBoost = burst * (1 - spreadPhase) * 0.5;
        const alpha = Math.min(0.85, baseAlpha + burstBoost);

        // Color alternates between blue and pink
        const isBlue = i % 2 === 0;
        const cr = isBlue ? 100 : r;
        const cg = isBlue ? 180 : g;
        const cb = isBlue ? 240 : b;

        const lineWidth = (1.2 + holdProgress * 1.2 + beatEnv * 0.8) * (1 - i * 0.1);

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha})`;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }

      // ── Center core ────────────────────────────────────────────────────────
      // Soft radial glow
      const glowR = baseRadius * (0.85 + beatEnv * 0.18 + holdProgress * 0.3 + burst * 0.4);
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      const glowAlpha = 0.12 + holdProgress * 0.18 + beatEnv * 0.10 + burst * 0.25;
      glow.addColorStop(0, `rgba(${r},${g},${b},${glowAlpha})`);
      glow.addColorStop(0.5, `rgba(100,180,240,${glowAlpha * 0.5})`);
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Center dot
      const dotR = baseRadius * (0.28 + beatEnv * 0.06 + holdProgress * 0.08 + burst * 0.15);
      const dotGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR);
      dotGrad.addColorStop(0, `rgba(${r},${g},${b},${0.55 + holdProgress * 0.35 + beatEnv * 0.1})`);
      dotGrad.addColorStop(0.6, `rgba(100,180,240,${0.25 + holdProgress * 0.2})`);
      dotGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = dotGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
      ctx.fill();

      // Hold progress arc around center
      if (holdActiveRef.current && holdProgress > 0 && holdProgress < 1) {
        const arcR = baseRadius * 0.55;
        ctx.beginPath();
        ctx.arc(cx, cy, arcR, -Math.PI / 2, -Math.PI / 2 + holdProgress * Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},0.55)`;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.stroke();

        // Track background
        ctx.beginPath();
        ctx.arc(cx, cy, arcR, -Math.PI / 2 + holdProgress * Math.PI * 2, -Math.PI / 2 + Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},0.10)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // ── Text ───────────────────────────────────────────────────────────────
      const { text, reveal, hint } = textRef.current;
      const textZoneTop = cy + Math.min(w, h) * 0.30;
      const textZoneH = h - textZoneTop - 20;

      if (text && reveal > 0) {
        // Task text
        ctx.save();
        ctx.globalAlpha = reveal;
        ctx.font = `300 ${Math.min(22, Math.max(15, w * 0.048))}px 'Plus Jakarta Sans', 'DM Sans', sans-serif`;
        ctx.fillStyle = `rgba(40,30,50,0.90)`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        // Word wrap
        const words = text.split(" ");
        const maxWidth = w * 0.78;
        const lineH = parseFloat(ctx.font) * 1.55;
        const lines: string[] = [];
        let line = "";
        for (const word of words) {
          const test = line ? line + " " + word : word;
          if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = word;
          } else {
            line = test;
          }
        }
        if (line) lines.push(line);

        const totalH = lines.length * lineH;
        let ty = textZoneTop + (textZoneH - totalH) / 2;
        ty = Math.max(textZoneTop + 8, ty);

        // Subtle offset upward from reveal
        const offsetY = (1 - reveal) * 14;
        for (const l of lines) {
          ctx.fillText(l, cx, ty + offsetY);
          ty += lineH;
        }
        ctx.restore();
      } else if (!text) {
        // Hint text
        const hintAlpha = holdActiveRef.current
          ? Math.max(0, 1 - holdProgress * 3)
          : 0.38;
        ctx.save();
        ctx.globalAlpha = hintAlpha;
        ctx.font = `300 ${Math.min(10, Math.max(8, w * 0.022))}px 'Plus Jakarta Sans', 'DM Sans', sans-serif`;
        ctx.fillStyle = `rgba(${r},${g},${b},1)`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.letterSpacing = "0.22em";
        ctx.fillText(hint.toUpperCase(), cx, textZoneTop + textZoneH * 0.35);
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [holdDuration]);

  // ── Hold interaction ───────────────────────────────────────────────────────
  const handlePressStart = useCallback(() => {
    if (castingRef.current || textRef.current.text) return;
    holdActiveRef.current = true;
    firedRef.current = false;
    holdStartRef.current = performance.now();
    startBeats();

    // Schedule fire after holdDuration
    const t = setTimeout(() => {
      if (holdActiveRef.current && !firedRef.current) {
        firedRef.current = true;
        burstRef.current = 1.0;
        stopBeats();
        // Final big beat
        try {
          const ctx2 = getAudioCtx();
          const now = ctx2.currentTime;
          const o = ctx2.createOscillator();
          const g2 = ctx2.createGain();
          o.connect(g2); g2.connect(ctx2.destination);
          o.frequency.setValueAtTime(55, now);
          o.frequency.exponentialRampToValueAtTime(22, now + 0.25);
          g2.gain.setValueAtTime(0, now);
          g2.gain.linearRampToValueAtTime(0.45, now + 0.015);
          g2.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
          o.start(now); o.stop(now + 0.31);
        } catch {}
        onHoldRef.current();
      }
    }, holdDuration);

    // Store timer to cancel on release
    (holdActiveRef as any)._timer = t;
  }, [startBeats, stopBeats, holdDuration, getAudioCtx]);

  const handlePressEnd = useCallback(() => {
    holdActiveRef.current = false;
    holdStartRef.current = null;
    stopBeats();
    if ((holdActiveRef as any)._timer) {
      clearTimeout((holdActiveRef as any)._timer);
      (holdActiveRef as any)._timer = null;
    }
    if (!firedRef.current) {
      firedRef.current = false;
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
