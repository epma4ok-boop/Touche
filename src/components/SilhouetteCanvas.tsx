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

    // ── Sensual female figure — standing, back arched ──────────────────────
    const drawFemaleStanding = (
      ctx: CanvasRenderingContext2D,
      cx: number, cy: number,
      scale: number, alpha: number,
      cr: number, cg: number, cb: number
    ) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      // head — slightly tilted back
      ctx.beginPath();
      ctx.ellipse(0, -220, 17, 21, 0.15, 0, Math.PI * 2);
      ctx.fill();

      // long neck
      ctx.beginPath();
      ctx.moveTo(-8, -200);
      ctx.bezierCurveTo(-10, -190, -8, -178, -6, -170);
      ctx.lineTo(6, -170);
      ctx.bezierCurveTo(8, -178, 8, -190, 6, -200);
      ctx.closePath();
      ctx.fill();

      // torso — feminine with waist and hip curve
      ctx.beginPath();
      ctx.moveTo(-18, -170); // left shoulder
      ctx.bezierCurveTo(-32, -155, -38, -130, -34, -108); // left shoulder slope
      ctx.bezierCurveTo(-44, -100, -48, -88, -44, -76);   // left breast curve
      ctx.bezierCurveTo(-40, -64, -36, -56, -30, -50);    // under left breast
      ctx.bezierCurveTo(-26, -44, -22, -38, -20, -28);    // left waist in
      ctx.bezierCurveTo(-20, -18, -20, -8, -16, 0);       // waist
      ctx.bezierCurveTo(-12, 10, -6, 16, 0, 18);          // hip start
      ctx.bezierCurveTo(6, 16, 12, 10, 16, 0);
      ctx.bezierCurveTo(20, -8, 20, -18, 20, -28);        // right waist
      ctx.bezierCurveTo(22, -38, 26, -44, 30, -50);       // right waist out
      ctx.bezierCurveTo(36, -56, 40, -64, 44, -76);
      ctx.bezierCurveTo(48, -88, 44, -100, 34, -108);     // right breast
      ctx.bezierCurveTo(38, -130, 32, -155, 18, -170);    // right shoulder
      ctx.bezierCurveTo(8, -165, -8, -165, -18, -170);
      ctx.closePath();
      ctx.fill();

      // hips and legs
      ctx.beginPath();
      ctx.moveTo(-20, -2);
      ctx.bezierCurveTo(-30, 14, -38, 34, -36, 60);   // left hip swell
      ctx.bezierCurveTo(-34, 80, -28, 92, -22, 110);   // left thigh outer
      ctx.bezierCurveTo(-18, 126, -16, 148, -14, 172); // left leg
      ctx.bezierCurveTo(-13, 200, -12, 230, -12, 260);
      ctx.lineTo(-4, 260);
      ctx.bezierCurveTo(-4, 230, -6, 200, -6, 172);
      ctx.bezierCurveTo(-6, 148, -4, 126, 0, 110);     // inner thigh
      ctx.bezierCurveTo(4, 126, 6, 148, 6, 172);
      ctx.bezierCurveTo(6, 200, 4, 230, 4, 260);
      ctx.lineTo(12, 260);
      ctx.bezierCurveTo(12, 230, 13, 200, 14, 172);
      ctx.bezierCurveTo(16, 148, 18, 126, 22, 110);
      ctx.bezierCurveTo(28, 92, 34, 80, 36, 60);       // right thigh outer
      ctx.bezierCurveTo(38, 34, 30, 14, 20, -2);       // right hip
      ctx.closePath();
      ctx.fill();

      // arm raised — left arm up near head
      ctx.beginPath();
      ctx.moveTo(-34, -130);
      ctx.bezierCurveTo(-48, -110, -54, -78, -50, -42);
      ctx.bezierCurveTo(-46, -20, -38, 0, -28, 18);
      ctx.bezierCurveTo(-24, 24, -20, 22, -20, 16);
      ctx.bezierCurveTo(-26, 2, -32, -18, -34, -40);
      ctx.bezierCurveTo(-36, -72, -30, -102, -18, -122);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    // ── Reclining figure — sensual S-curve ────────────────────────────────
    const drawReclining = (
      ctx: CanvasRenderingContext2D,
      cx: number, cy: number,
      scale: number, alpha: number,
      cr: number, cg: number, cb: number
    ) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.rotate(-0.14);

      // head, propped up
      ctx.beginPath();
      ctx.ellipse(-190, -40, 19, 22, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // S-curve body
      ctx.beginPath();
      ctx.moveTo(-172, -52);
      ctx.bezierCurveTo(-148, -66, -110, -68, -80, -54); // shoulders
      ctx.bezierCurveTo(-60, -46, -46, -34, -38, -18);   // chest
      ctx.bezierCurveTo(-30, -4, -28, 8, -32, 20);       // waist dip
      ctx.bezierCurveTo(-38, 34, -52, 44, -58, 58);      // hip rise
      ctx.bezierCurveTo(-64, 72, -60, 84, -44, 90);      // hip peak
      ctx.bezierCurveTo(-20, 96, 20, 90, 60, 80);        // thigh slope
      ctx.bezierCurveTo(100, 70, 140, 58, 180, 52);      // legs
      ctx.bezierCurveTo(210, 46, 230, 44, 240, 50);
      ctx.bezierCurveTo(242, 56, 232, 64, 210, 68);
      ctx.bezierCurveTo(170, 74, 120, 82, 80, 92);
      ctx.bezierCurveTo(40, 102, -4, 112, -40, 106);     // return path
      ctx.bezierCurveTo(-68, 100, -80, 86, -76, 70);
      ctx.bezierCurveTo(-72, 56, -56, 48, -48, 34);
      ctx.bezierCurveTo(-40, 20, -40, 6, -46, -8);       // waist return
      ctx.bezierCurveTo(-52, -22, -64, -34, -82, -42);
      ctx.bezierCurveTo(-112, -56, -148, -54, -168, -38);
      ctx.bezierCurveTo(-172, -34, -172, -28, -170, -24);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    // ── Couple embrace — two bodies close together ─────────────────────────
    const drawCouple = (
      ctx: CanvasRenderingContext2D,
      cx: number, cy: number,
      scale: number, alpha: number,
      cr: number, cg: number, cb: number
    ) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      // Figure A — slightly behind, taller
      ctx.save();
      ctx.translate(-18, 0);
      // head
      ctx.beginPath();
      ctx.ellipse(0, -215, 17, 20, -0.1, 0, Math.PI * 2);
      ctx.fill();
      // body
      ctx.beginPath();
      ctx.moveTo(-16, -196);
      ctx.bezierCurveTo(-26, -178, -30, -148, -28, -118);
      ctx.bezierCurveTo(-26, -90, -20, -66, -14, -40);
      ctx.bezierCurveTo(-10, -18, -8, 8, -10, 34);
      ctx.bezierCurveTo(-12, 60, -14, 90, -10, 120);
      ctx.bezierCurveTo(-8, 148, -6, 178, -6, 210);
      ctx.lineTo(6, 210);
      ctx.bezierCurveTo(6, 178, 8, 148, 10, 120);
      ctx.bezierCurveTo(14, 90, 12, 60, 10, 34);
      ctx.bezierCurveTo(8, 8, 10, -18, 14, -40);
      ctx.bezierCurveTo(20, -66, 26, -90, 28, -118);
      ctx.bezierCurveTo(30, -148, 26, -178, 16, -196);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Figure B — in front, feminine, leaning in
      ctx.save();
      ctx.translate(22, 10);
      ctx.scale(0.9, 0.9);
      // head
      ctx.beginPath();
      ctx.ellipse(0, -205, 16, 20, 0.14, 0, Math.PI * 2);
      ctx.fill();
      // feminine body with curves
      ctx.beginPath();
      ctx.moveTo(-14, -187);
      ctx.bezierCurveTo(-22, -168, -28, -138, -24, -108);
      ctx.bezierCurveTo(-32, -100, -36, -86, -32, -72); // breast
      ctx.bezierCurveTo(-28, -58, -22, -46, -18, -32);  // waist
      ctx.bezierCurveTo(-16, -18, -16, -4, -10, 10);    // hip
      ctx.bezierCurveTo(-6, 20, -4, 32, -6, 46);
      ctx.bezierCurveTo(-8, 62, -10, 82, -8, 110);
      ctx.bezierCurveTo(-6, 136, -4, 164, -4, 192);
      ctx.lineTo(4, 192);
      ctx.bezierCurveTo(4, 164, 6, 136, 8, 110);
      ctx.bezierCurveTo(10, 82, 8, 62, 6, 46);
      ctx.bezierCurveTo(4, 32, 6, 20, 10, 10);
      ctx.bezierCurveTo(16, -4, 16, -18, 18, -32);
      ctx.bezierCurveTo(22, -46, 28, -58, 32, -72);
      ctx.bezierCurveTo(36, -86, 32, -100, 24, -108);
      ctx.bezierCurveTo(28, -138, 22, -168, 14, -187);
      ctx.closePath();
      ctx.fill();
      // arm reaching back around figure A
      ctx.beginPath();
      ctx.moveTo(-26, -120);
      ctx.bezierCurveTo(-42, -102, -46, -64, -38, -28);
      ctx.bezierCurveTo(-32, -8, -18, 10, -4, 20);
      ctx.bezierCurveTo(2, 24, 6, 20, 4, 14);
      ctx.bezierCurveTo(-8, 4, -20, -12, -26, -30);
      ctx.bezierCurveTo(-32, -62, -28, -96, -16, -116);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

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

      const breathe  = 1 + 0.016 * Math.sin(t * 0.52);
      const breathe2 = 1 + 0.013 * Math.sin(t * 0.38 + 1.3);
      const breathe3 = 1 + 0.014 * Math.sin(t * 0.44 + 2.1);

      const baseScale = Math.min(h / 640, w / 320);

      // Large couple — right-center, behind action
      drawCouple(ctx, w * 0.62, h * 0.46, breathe * baseScale * 0.92, 0.055, cr, cg, cb);

      // Female standing — left side
      drawFemaleStanding(ctx, w * 0.22, h * 0.48, breathe2 * baseScale * 0.72, 0.038, cr, cg, cb);

      // Reclining — bottom
      drawReclining(ctx, w * 0.5, h * 0.84, breathe3 * Math.min(w / 480, 0.78), 0.030, cr, cg, cb);

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
