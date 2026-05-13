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
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; alpha: number;
  hot: boolean;
}

export default function FlameCanvas({
  onTap, isCasting, flashTrigger, color, taskText, revealProgress, hintText,
}: FlameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const stateRef = useRef({
    width: 0, height: 0, cx: 0, cy: 0, flameBaseY: 0, dpr: 1,
    time: 0, flash: 0,
    currentR: color.r, currentG: color.g, currentB: color.b,
    targetR: color.r, targetG: color.g, targetB: color.b,
    particles: [] as Particle[],
  });
  const textRef = useRef({ text: taskText, reveal: revealProgress, hint: hintText });
  const castingRef = useRef(false);
  const tapRef = useRef(onTap);

  useEffect(() => { tapRef.current = onTap; }, [onTap]);
  useEffect(() => { textRef.current = { text: taskText, reveal: revealProgress, hint: hintText }; }, [taskText, revealProgress, hintText]);
  useEffect(() => { castingRef.current = isCasting; }, [isCasting]);
  useEffect(() => {
    const s = stateRef.current;
    s.targetR = color.r; s.targetG = color.g; s.targetB = color.b;
  }, [color]);
  useEffect(() => {
    if (flashTrigger > 0) {
      stateRef.current.flash = 1.0;
      stateRef.current.particles.forEach(p => {
        p.vx += (Math.random() - 0.5) * 3.5;
        p.vy -= Math.random() * 4;
        p.hot = true;
      });
    }
  }, [flashTrigger]);

  const spawn = useCallback(() => {
    const s = stateRef.current;
    const spread = s.width * 0.10;
    const count = castingRef.current ? 5 : 2;
    for (let i = 0; i < count; i++) {
      s.particles.push({
        x: s.cx + (Math.random() - 0.5) * spread * 2,
        y: s.flameBaseY,
        vx: (Math.random() - 0.5) * 0.9,
        vy: -(1.5 + Math.random() * 3.0),
        life: 0,
        maxLife: 50 + Math.random() * 70,
        size: 5 + Math.random() * 14,
        alpha: 0.55 + Math.random() * 0.45,
        hot: castingRef.current,
      });
    }
  }, []);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    const rect = canvas.getBoundingClientRect();
    s.width = Math.round(rect.width);
    s.height = Math.round(rect.height);
    if (!s.width || !s.height) return;
    const dpr = window.devicePixelRatio || 1;
    s.dpr = dpr;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    s.cx = s.width / 2;
    s.flameBaseY = s.height * 0.72;
    s.cy = s.height * 0.5;
  }, []);

  function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (ctx.measureText(test).width <= maxWidth) { cur = test; }
      else { if (cur) lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  const drawHint = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, cr: number, cg: number, cb: number, time: number, alpha: number, text: string) => {
    if (!text || alpha <= 0) return;
    const size = Math.max(9, Math.min(13, w * 0.030));
    ctx.save();
    ctx.font = `200 ${size}px 'Raleway', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = alpha * (0.55 + 0.35 * Math.sin(time * 2.0));
    ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
    ctx.shadowBlur = 14;
    ctx.shadowColor = `rgba(${cr},${cg},${cb},0.8)`;
    const spaced = text.split("").join(String.fromCharCode(8202));
    ctx.fillText(spaced, w / 2, h * 0.22);
    ctx.restore();
  }, []);

  const drawTaskText = useCallback((ctx: CanvasRenderingContext2D, w: number, cr: number, cg: number, cb: number, text: string, reveal: number, centerY: number) => {
    if (!text || reveal < 0.01) return;

    const maxWidth = Math.min(w * 0.80, 340);
    let fontSize = Math.max(17, Math.min(28, w * 0.062));
    let lines: string[] = [];
    for (let attempt = 0; attempt < 4; attempt++) {
      ctx.font = `300 italic ${fontSize}px 'Cormorant Garamond', Georgia, serif`;
      lines = wrapText(ctx, text, maxWidth);
      if (lines.length <= 5) break;
      fontSize = Math.max(14, fontSize * 0.85);
    }

    const eased = 1 - Math.pow(1 - reveal, 3);
    const alpha = Math.pow(Math.max(0, reveal - 0.04) / 0.96, 1.4);
    const lineH = fontSize * 1.64;
    const totalH = lines.length * lineH;
    const textCY = centerY;

    ctx.save();

    // Legibility backdrop
    if (alpha > 0.05) {
      const padX = Math.min(w * 0.46, 200);
      const padY = totalH * 0.62 + fontSize * 0.6;
      ctx.save();
      ctx.globalAlpha = alpha * 0.72;
      const bd = ctx.createRadialGradient(w / 2, textCY, 0, w / 2, textCY, padX);
      bd.addColorStop(0, "rgba(2,1,6,0.97)");
      bd.addColorStop(0.55, "rgba(2,1,6,0.86)");
      bd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bd;
      ctx.beginPath();
      ctx.ellipse(w / 2, textCY, padX, padY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Scale-in animation
    const scale = 0.28 + 0.72 * eased;
    ctx.translate(w / 2, textCY);
    ctx.scale(scale, scale);
    ctx.translate(-w / 2, -textCY);

    ctx.font = `300 italic ${fontSize}px 'Cormorant Garamond', Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    lines.forEach((line, i) => {
      const ly = textCY - totalH / 2 + i * lineH + lineH / 2;

      // Coloured glow pass
      ctx.save();
      ctx.globalAlpha = alpha * 0.38;
      ctx.shadowBlur = 32;
      ctx.shadowColor = `rgb(${cr},${cg},${cb})`;
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.fillText(line, w / 2, ly);
      ctx.restore();

      // Main readable text — cream white
      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha * 1.05);
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
      // Strong legibility: dark stroke behind
      ctx.lineWidth = fontSize * 0.22;
      ctx.strokeStyle = "rgba(2,1,6,0.85)";
      ctx.lineJoin = "round";
      ctx.strokeText(line, w / 2, ly);
      // Bright fill
      ctx.fillStyle = "#fff8f2";
      ctx.fillText(line, w / 2, ly);
      ctx.restore();
    });

    ctx.restore();
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);

    const ls = 0.04;
    s.currentR += (s.targetR - s.currentR) * ls;
    s.currentG += (s.targetG - s.currentG) * ls;
    s.currentB += (s.targetB - s.currentB) * ls;
    const cr = Math.round(s.currentR);
    const cg = Math.round(s.currentG);
    const cb = Math.round(s.currentB);
    const { width: w, height: h, cx, flameBaseY, time, flash } = s;

    // Background
    ctx.fillStyle = "#060409";
    ctx.fillRect(0, 0, w, h);

    // Ambient glow from flame base
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const ag = ctx.createRadialGradient(cx, flameBaseY, 0, cx, flameBaseY, h * 0.65);
    ag.addColorStop(0, `rgba(${cr},${cg},${cb},${0.22 + flash * 0.12 + 0.06 * Math.sin(time * 1.8)})`);
    ag.addColorStop(0.35, `rgba(${cr},${cg},${cb},0.06)`);
    ag.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = ag;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // Spawn + draw particles
    spawn();
    s.particles = s.particles.filter(p => p.life < p.maxLife);
    for (const p of s.particles) {
      p.life++;
      p.x += p.vx + Math.sin(time * 2.3 + p.life * 0.09) * 0.35;
      p.y += p.vy;
      p.vy *= 0.975;
      p.size *= 0.993;
      const lr = p.life / p.maxLife;
      const a = p.alpha * (1 - lr) * Math.sin(lr * Math.PI);
      const hotness = Math.max(0, 1 - lr * 1.4);
      const pr = Math.min(255, cr + Math.round((255 - cr) * hotness * 0.85));
      const pg = Math.min(255, cg + Math.round((200 - cg) * hotness * 0.35));
      const pb = Math.min(255, Math.round(cb * (1 - hotness * 0.8)));

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const pg2 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      pg2.addColorStop(0, `rgba(${pr},${pg},${pb},${a})`);
      pg2.addColorStop(0.4, `rgba(${cr},${cg},${cb},${a * 0.45})`);
      pg2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = pg2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Core flame pillar
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const pillarW = w * 0.055;
    const pillarH = h * 0.28;
    const pillar = ctx.createLinearGradient(cx, flameBaseY, cx, flameBaseY - pillarH);
    pillar.addColorStop(0, `rgba(${Math.min(255, cr + 100)},${Math.min(255, cg + 80)},${Math.min(255, cb + 60)},${0.55 + 0.20 * Math.sin(time * 3.2)})`);
    pillar.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.25)`);
    pillar.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = pillar;
    const flutter = Math.sin(time * 4.1) * pillarW * 0.35;
    ctx.beginPath();
    ctx.moveTo(cx - pillarW + flutter, flameBaseY);
    ctx.bezierCurveTo(
      cx - pillarW * 0.5 + flutter, flameBaseY - pillarH * 0.4,
      cx + pillarW * 0.3 - flutter, flameBaseY - pillarH * 0.7,
      cx + flutter * 0.5, flameBaseY - pillarH
    );
    ctx.bezierCurveTo(
      cx - pillarW * 0.3 - flutter, flameBaseY - pillarH * 0.7,
      cx + pillarW * 0.5 - flutter, flameBaseY - pillarH * 0.4,
      cx + pillarW - flutter, flameBaseY
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Text area (upper half)
    const textCY = h * 0.35;
    const { text, reveal, hint } = textRef.current;

    if (castingRef.current) {
      drawHint(ctx, w, h, cr, cg, cb, time, 1, hint);
    } else if (!text || reveal < 0.01) {
      drawHint(ctx, w, h, cr, cg, cb, time, 1, hint);
    } else {
      drawTaskText(ctx, w, cr, cg, cb, text, reveal, textCY);
      // Hint fades out as text reveals
      if (reveal < 0.5) {
        drawHint(ctx, w, h, cr, cg, cb, time, 1 - reveal * 2, hint);
      }
    }

    // Flash
    if (flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${flash * 0.18})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }, [spawn, drawHint, drawTaskText]);

  const animate = useCallback(() => {
    const s = stateRef.current;
    s.time += 0.016;
    if (s.flash > 0) s.flash = Math.max(0, s.flash - 0.022);
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
    return () => { cancelAnimationFrame(animFrameRef.current); ro.disconnect(); clearTimeout(t); };
  }, [resize, animate]);

  const handleInteraction = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    tapRef.current();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleInteraction}
      onTouchEnd={handleInteraction}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer" }}
    />
  );
}
