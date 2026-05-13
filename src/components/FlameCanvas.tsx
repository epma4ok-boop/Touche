import { useEffect, useRef, useCallback } from "react";

export type FlameColor = { r: number; g: number; b: number };

interface FlameCanvasProps {
  onTap: () => void;
  isCasting: boolean;
  flashTrigger: number;
  color: FlameColor;
  taskText: string;
  revealProgress: number;
  hintText: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  alpha: number;
}

export default function FlameCanvas({
  onTap, isCasting, flashTrigger, color, taskText, revealProgress, hintText,
}: FlameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const stateRef = useRef({
    width: 0, height: 0, cx: 0, cy: 0, flameH: 0, dpr: 1,
    time: 0, flash: 0,
    currentR: color.r, currentG: color.g, currentB: color.b,
    targetR: color.r, targetG: color.g, targetB: color.b,
    particles: [] as Particle[],
  });
  const textRef = useRef({ text: taskText, reveal: revealProgress, hint: hintText });
  const castingRef = useRef(false);

  useEffect(() => {
    textRef.current = { text: taskText, reveal: revealProgress, hint: hintText };
  }, [taskText, revealProgress, hintText]);

  useEffect(() => {
    castingRef.current = isCasting;
  }, [isCasting]);

  useEffect(() => {
    const s = stateRef.current;
    s.targetR = color.r; s.targetG = color.g; s.targetB = color.b;
  }, [color]);

  useEffect(() => {
    if (flashTrigger > 0) {
      stateRef.current.flash = 1;
      // scatter particles on tap
      for (const p of stateRef.current.particles) {
        p.vx += (Math.random() - 0.5) * 3;
        p.vy -= Math.random() * 3;
      }
    }
  }, [flashTrigger]);

  const spawnParticle = useCallback(() => {
    const s = stateRef.current;
    const spread = s.width * 0.12;
    const p: Particle = {
      x: s.cx + (Math.random() - 0.5) * spread,
      y: s.cy + s.flameH * 0.3,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -(1.2 + Math.random() * 2.5),
      life: 0,
      maxLife: 40 + Math.random() * 60,
      size: 4 + Math.random() * 12,
      alpha: 0.6 + Math.random() * 0.4,
    };
    s.particles.push(p);
  }, []);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    const rect = canvas.getBoundingClientRect();
    s.width = Math.round(rect.width);
    s.height = Math.round(rect.height);
    if (s.width === 0 || s.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    s.dpr = dpr;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    s.cx = s.width / 2;
    s.cy = s.height * 0.62;
    s.flameH = Math.min(s.height * 0.55, 380);
  }, []);

  function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const w of words) {
      const test = current ? current + " " + w : w;
      if (ctx.measureText(test).width <= maxWidth) { current = test; }
      else { if (current) lines.push(current); current = w; }
    }
    if (current) lines.push(current);
    return lines;
  }

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);

    const lerpSpeed = 0.04;
    s.currentR += (s.targetR - s.currentR) * lerpSpeed;
    s.currentG += (s.targetG - s.currentG) * lerpSpeed;
    s.currentB += (s.targetB - s.currentB) * lerpSpeed;
    const cr = Math.round(s.currentR);
    const cg = Math.round(s.currentG);
    const cb = Math.round(s.currentB);

    const { width: w, height: h, cx, cy, flameH, time, flash } = s;

    ctx.fillStyle = "#030508";
    ctx.fillRect(0, 0, w, h);

    // Ambient glow from bottom
    const ambient = ctx.createRadialGradient(cx, cy + flameH * 0.2, 0, cx, cy + flameH * 0.2, flameH * 1.5);
    ambient.addColorStop(0, `rgba(${cr},${cg},${cb},${0.12 + flash * 0.08})`);
    ambient.addColorStop(0.5, `rgba(${cr},${cg},${cb},${0.05})`);
    ambient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = ambient;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // Spawn particles
    const spawnRate = castingRef.current ? 4 : 2;
    for (let i = 0; i < spawnRate; i++) spawnParticle();

    // Update & draw particles
    s.particles = s.particles.filter(p => p.life < p.maxLife);
    for (const p of s.particles) {
      p.life++;
      p.x += p.vx + Math.sin(time * 2.1 + p.life * 0.08) * 0.3;
      p.y += p.vy;
      p.vy *= 0.98;
      p.size *= 0.992;
      const lifeRatio = p.life / p.maxLife;
      const alpha = p.alpha * (1 - lifeRatio) * Math.sin(lifeRatio * Math.PI);

      // Color: base -> brighter -> transparent top
      const hotness = 1 - lifeRatio;
      const pr = Math.min(255, cr + Math.round((255 - cr) * hotness * 0.7));
      const pg = Math.min(255, Math.round(cg * hotness * 0.5));
      const pb = Math.min(255, Math.round(cb * hotness * 0.3));

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      grad.addColorStop(0, `rgba(${pr},${pg},${pb},${alpha})`);
      grad.addColorStop(0.4, `rgba(${cr},${cg},${cb},${alpha * 0.5})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Flame base glow
    const baseGlow = ctx.createRadialGradient(cx, cy + flameH * 0.3, 0, cx, cy + flameH * 0.3, flameH * 0.6);
    baseGlow.addColorStop(0, `rgba(${cr},${cg},${cb},${0.35 + flash * 0.2 + 0.08 * Math.sin(time * 2)})`);
    baseGlow.addColorStop(0.4, `rgba(${cr},${cg},${cb},0.12)`);
    baseGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = baseGlow;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // --- Draw text ---
    const { text, reveal, hint } = textRef.current;

    if (castingRef.current) {
      // Show pulsing hint while casting
      if (hint) {
        const hintSize = Math.max(9, Math.min(13, w * 0.03));
        ctx.save();
        ctx.font = `200 ${hintSize}px 'Raleway', sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = 0.5 + 0.4 * Math.sin(time * 2.5);
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(${cr},${cg},${cb},0.8)`;
        const spaced = hint.split("").join(String.fromCharCode(8202));
        ctx.fillText(spaced, cx, cy - flameH * 0.45);
        ctx.restore();
      }
      return;
    }

    if (!text || reveal < 0.01) {
      // Idle hint
      if (hint) {
        const hintSize = Math.max(9, Math.min(13, w * 0.03));
        ctx.save();
        ctx.font = `200 ${hintSize}px 'Raleway', sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = 0.4 + 0.3 * Math.sin(time * 1.5);
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(${cr},${cg},${cb},0.7)`;
        const spaced = hint.split("").join(String.fromCharCode(8202));
        ctx.fillText(spaced, cx, cy - flameH * 0.45);
        ctx.restore();
      }
      return;
    }

    const maxWidth = Math.min(w * 0.78, 340);
    let fontSize = Math.max(16, Math.min(26, w * 0.058));
    let lines: string[] = [];
    for (let attempt = 0; attempt < 4; attempt++) {
      ctx.font = `600 italic ${fontSize}px 'Cormorant Garamond', Georgia, serif`;
      lines = wrapText(ctx, text, maxWidth);
      if (lines.length <= 5) break;
      fontSize = Math.max(13, fontSize * 0.85);
    }

    const eased = 1 - Math.pow(1 - reveal, 3);
    const alpha = Math.pow(Math.max(0, reveal - 0.04) / 0.96, 1.6);
    const yDrift = (1 - eased) * 20;
    const lineH = fontSize * 1.58;
    const totalH = lines.length * lineH;
    const textY = cy - flameH * 0.45 + yDrift;

    ctx.save();

    // Backdrop for text
    if (alpha > 0.05) {
      const padX = maxWidth * 0.65;
      const padY = totalH * 0.6 + fontSize * 0.5;
      ctx.save();
      ctx.globalAlpha = alpha * 0.65;
      const backdrop = ctx.createRadialGradient(cx, textY, 0, cx, textY, padX);
      backdrop.addColorStop(0, "rgba(1,2,6,0.95)");
      backdrop.addColorStop(0.5, "rgba(1,2,6,0.80)");
      backdrop.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = backdrop;
      ctx.beginPath();
      ctx.ellipse(cx, textY, padX, padY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.font = `600 italic ${fontSize}px 'Cormorant Garamond', Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const scale = 0.25 + 0.75 * eased;
    ctx.translate(cx, textY);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -textY);

    lines.forEach((line, i) => {
      const lineY = textY - totalH / 2 + i * lineH + lineH / 2;
      ctx.save();
      ctx.globalAlpha = alpha * 0.40;
      ctx.shadowBlur = 28;
      ctx.shadowColor = `rgb(${cr},${cg},${cb})`;
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.fillText(line, cx, lineY);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha * 1.05);
      ctx.shadowBlur = 5;
      ctx.shadowColor = "rgba(0,0,0,0.95)";
      ctx.fillStyle = `rgba(255,253,248,${Math.min(1, alpha * 1.05)})`;
      ctx.fillText(line, cx, lineY);
      ctx.restore();
    });

    ctx.restore();

    // Flash overlay
    if (flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${flash * 0.22})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }, [spawnParticle]);

  const animate = useCallback(() => {
    const s = stateRef.current;
    s.time += 0.016;
    if (s.flash > 0) s.flash = Math.max(0, s.flash - 0.020);
    drawFrame();
    animFrameRef.current = requestAnimationFrame(animate);
  }, [drawFrame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    animFrameRef.current = requestAnimationFrame(animate);
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
    resize();
    const t = setTimeout(resize, 150);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      ro.disconnect();
      clearTimeout(t);
    };
  }, [resize, animate]);

  const handleClick = useCallback(() => { onTap(); }, [onTap]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      onTouchEnd={e => { e.preventDefault(); onTap(); }}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer" }}
    />
  );
}
