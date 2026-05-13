import { useEffect, useRef } from "react";

interface SilhouetteCanvasProps {
  r: number; g: number; b: number;
  opacity?: number;
}

export default function SilhouetteCanvas({ r, g, b, opacity = 1 }: SilhouetteCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    let raf: number;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    resize();

    let currentR = r, currentG = g, currentB = b;
    const lerpSpeed = 0.025;

    const startTime = performance.now();

    const drawCouple = (ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, alpha: number, cr: number, cg: number, cb: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.6)`;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      // Figure A — standing, slightly leaning
      ctx.beginPath();
      // head
      ctx.ellipse(-28, -195, 18, 22, -0.1, 0, Math.PI * 2);
      ctx.fill();
      // neck + torso
      ctx.beginPath();
      ctx.moveTo(-38, -173);
      ctx.bezierCurveTo(-44, -155, -50, -130, -46, -100);
      ctx.bezierCurveTo(-42, -68, -38, -40, -34, -10);
      ctx.bezierCurveTo(-30, 20, -28, 50, -30, 80);
      ctx.bezierCurveTo(-32, 110, -34, 140, -30, 170);
      ctx.lineTo(-18, 170);
      ctx.bezierCurveTo(-20, 140, -18, 110, -16, 80);
      ctx.bezierCurveTo(-14, 50, -12, 20, -14, -10);
      ctx.bezierCurveTo(-16, -40, -14, -68, -12, -100);
      ctx.bezierCurveTo(-10, -130, -14, -155, -18, -173);
      ctx.closePath();
      ctx.fill();
      // arm reaching forward
      ctx.beginPath();
      ctx.moveTo(-46, -130);
      ctx.bezierCurveTo(-60, -110, -55, -70, -38, -40);
      ctx.bezierCurveTo(-30, -25, -10, 0, 10, 10);
      ctx.bezierCurveTo(16, 12, 18, 8, 14, 4);
      ctx.bezierCurveTo(-4, -8, -22, -28, -30, -42);
      ctx.bezierCurveTo(-44, -70, -48, -108, -34, -128);
      ctx.closePath();
      ctx.fill();

      // Figure B — leaning in, slightly in front
      ctx.save();
      ctx.translate(58, -12);
      ctx.scale(0.88, 0.88);
      // head
      ctx.beginPath();
      ctx.ellipse(0, -178, 17, 21, 0.15, 0, Math.PI * 2);
      ctx.fill();
      // torso
      ctx.beginPath();
      ctx.moveTo(-10, -157);
      ctx.bezierCurveTo(-18, -135, -22, -105, -20, -75);
      ctx.bezierCurveTo(-18, -45, -14, -18, -10, 8);
      ctx.bezierCurveTo(-6, 34, -4, 60, -6, 88);
      ctx.bezierCurveTo(-8, 118, -10, 148, -6, 178);
      ctx.lineTo(6, 178);
      ctx.bezierCurveTo(8, 148, 6, 118, 4, 88);
      ctx.bezierCurveTo(2, 60, 4, 34, 8, 8);
      ctx.bezierCurveTo(12, -18, 16, -45, 18, -75);
      ctx.bezierCurveTo(20, -105, 16, -135, 8, -157);
      ctx.closePath();
      ctx.fill();
      // arm reaching
      ctx.beginPath();
      ctx.moveTo(18, -120);
      ctx.bezierCurveTo(32, -100, 28, -55, 10, -22);
      ctx.bezierCurveTo(0, -4, -22, 8, -42, 14);
      ctx.bezierCurveTo(-50, 16, -52, 10, -48, 6);
      ctx.bezierCurveTo(-28, 0, -8, -10, 2, -24);
      ctx.bezierCurveTo(18, -52, 22, -96, 8, -118);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.restore();
    };

    // Second pose — reclining figure
    const drawReclining = (ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, alpha: number, cr: number, cg: number, cb: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.rotate(0.08);

      // reclining figure - horizontal elongated silhouette
      // head
      ctx.beginPath();
      ctx.ellipse(-220, -10, 22, 20, -0.2, 0, Math.PI * 2);
      ctx.fill();
      // body curve
      ctx.beginPath();
      ctx.moveTo(-200, -22);
      ctx.bezierCurveTo(-160, -34, -100, -38, -50, -28);
      ctx.bezierCurveTo(0, -18, 50, 0, 100, 8);
      ctx.bezierCurveTo(140, 14, 180, 12, 220, 20);
      ctx.bezierCurveTo(240, 24, 250, 30, 240, 36);
      ctx.bezierCurveTo(200, 30, 160, 26, 120, 20);
      ctx.bezierCurveTo(70, 12, 20, 0, -30, -8);
      ctx.bezierCurveTo(-80, -16, -140, -12, -180, -2);
      ctx.bezierCurveTo(-198, 2, -208, 6, -200, 10);
      ctx.closePath();
      ctx.fill();
      // arm up
      ctx.beginPath();
      ctx.moveTo(-180, -24);
      ctx.bezierCurveTo(-170, -50, -140, -80, -110, -100);
      ctx.bezierCurveTo(-90, -112, -70, -110, -72, -102);
      ctx.bezierCurveTo(-70, -92, -88, -92, -102, -82);
      ctx.bezierCurveTo(-128, -62, -154, -34, -164, -10);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    // Third pose — embrace silhouette, very abstract
    const drawEmbrace = (ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, alpha: number, cr: number, cg: number, cb: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      // Combined embrace shape — more abstract, merged silhouette
      ctx.beginPath();
      // left head
      ctx.ellipse(-22, -210, 19, 23, -0.12, 0, Math.PI * 2);
      ctx.fill();
      // right head
      ctx.beginPath();
      ctx.ellipse(24, -205, 17, 21, 0.12, 0, Math.PI * 2);
      ctx.fill();
      // merged body
      ctx.beginPath();
      ctx.moveTo(-44, -188);
      ctx.bezierCurveTo(-52, -160, -56, -120, -50, -80);
      ctx.bezierCurveTo(-44, -40, -30, 0, -20, 40);
      ctx.bezierCurveTo(-12, 70, -10, 100, -12, 130);
      ctx.bezierCurveTo(-14, 158, -16, 182, -12, 200);
      ctx.lineTo(0, 200);
      ctx.bezierCurveTo(4, 182, 4, 158, 2, 130);
      ctx.bezierCurveTo(0, 100, 2, 70, 10, 40);
      ctx.bezierCurveTo(20, 0, 34, -40, 40, -80);
      ctx.bezierCurveTo(46, -120, 42, -160, 36, -188);
      ctx.closePath();
      ctx.fill();
      // arms wrapping
      ctx.beginPath();
      ctx.moveTo(-52, -140);
      ctx.bezierCurveTo(-68, -120, -72, -80, -60, -44);
      ctx.bezierCurveTo(-52, -20, -30, 0, -10, 10);
      ctx.bezierCurveTo(-2, 14, 2, 10, 0, 4);
      ctx.bezierCurveTo(-18, -6, -36, -24, -44, -46);
      ctx.bezierCurveTo(-54, -78, -50, -114, -38, -134);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(48, -130);
      ctx.bezierCurveTo(62, -110, 65, -70, 52, -35);
      ctx.bezierCurveTo(44, -12, 22, 4, 2, 12);
      ctx.bezierCurveTo(-4, 14, -8, 10, -6, 4);
      ctx.bezierCurveTo(14, -4, 32, -18, 40, -38);
      ctx.bezierCurveTo(52, -68, 48, -104, 34, -124);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    const draw = (now: number) => {
      const t = (now - startTime) / 1000;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      currentR += (r - currentR) * lerpSpeed;
      currentG += (g - currentG) * lerpSpeed;
      currentB += (b - currentB) * lerpSpeed;
      const cr = Math.round(currentR);
      const cg = Math.round(currentG);
      const cb = Math.round(currentB);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // breathing scale
      const breathe = 1 + 0.018 * Math.sin(t * 0.55);
      const breathe2 = 1 + 0.015 * Math.sin(t * 0.42 + 1.1);

      // Main couple — centered, large
      drawCouple(ctx, w * 0.5, h * 0.46, breathe * Math.min(h / 560, w / 300), 0.055, cr, cg, cb);

      // Reclining — bottom area
      drawReclining(ctx, w * 0.5, h * 0.82, breathe2 * Math.min(w / 520, 0.75), 0.035, cr, cg, cb);

      // Embrace — upper-right subtle
      drawEmbrace(ctx, w * 0.78, h * 0.25, breathe * Math.min(h / 900, 0.5), 0.028, cr, cg, cb);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [r, g, b]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        pointerEvents: "none",
        opacity,
      }}
    />
  );
}
