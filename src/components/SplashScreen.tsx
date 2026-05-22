// src/components/SplashScreen.tsx
import { useEffect, useRef, useState } from "react";
import { playHeartbeat } from "@/hooks/useSensualSound";

interface SplashScreenProps {
  onDone: () => void;
}

// Animated heartbeat line drawn on canvas
function HeartbeatLine({ color, visible }: { color: string; visible: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const progressRef = useRef(0);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cy = H / 2;

    // ECG-style path points (normalized 0..1 x)
    const ecgPoints: [number, number][] = [
      [0, 0], [0.15, 0], [0.20, -0.12], [0.25, 0],
      [0.30, -0.08], [0.35, 0.60], [0.40, -0.35], [0.44, 0.10],
      [0.50, 0], [0.55, 0], [0.60, -0.12], [0.65, 0],
      [0.70, -0.08], [0.75, 0.60], [0.80, -0.35], [0.84, 0.10],
      [0.90, 0], [1.0, 0],
    ];

    function getY(px: number): number {
      for (let i = 0; i < ecgPoints.length - 1; i++) {
        const [x0, y0] = ecgPoints[i];
        const [x1, y1] = ecgPoints[i + 1];
        if (px >= x0 && px <= x1) {
          const t = (px - x0) / (x1 - x0);
          return cy - (y0 + (y1 - y0) * t) * (H * 0.28);
        }
      }
      return cy;
    }

    let start: number | null = null;
    const duration = 1600;

    function draw(ts: number) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      progressRef.current = progress;

      ctx!.clearRect(0, 0, W, H);

      // Trail fade
      const tailLen = 0.3;
      const headX = progress;
      const tailX = Math.max(0, headX - tailLen);

      const grad = ctx!.createLinearGradient(tailX * W, 0, headX * W, 0);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.6, color.replace(")", ",0.55)").replace("rgb", "rgba"));
      grad.addColorStop(1, color);

      ctx!.beginPath();
      ctx!.strokeStyle = grad;
      ctx!.lineWidth = 2;
      ctx!.lineCap = "round";
      ctx!.lineJoin = "round";

      let started = false;
      for (let i = 0; i <= 120; i++) {
        const px = tailX + (headX - tailX) * (i / 120);
        const x = px * W;
        const y = getY(px);
        if (!started) { ctx!.moveTo(x, y); started = true; }
        else ctx!.lineTo(x, y);
      }
      ctx!.stroke();

      // Glowing dot at head
      const hx = headX * W;
      const hy = getY(headX);
      const glow = ctx!.createRadialGradient(hx, hy, 0, hx, hy, 10);
      glow.addColorStop(0, color.replace(")", ",0.9)").replace("rgb", "rgba"));
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx!.beginPath();
      ctx!.fillStyle = glow;
      ctx!.arc(hx, hy, 10, 0, Math.PI * 2);
      ctx!.fill();

      if (progress < 1) {
        animRef.current = requestAnimationFrame(draw);
      }
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [visible, color]);

  return (
    <canvas
      ref={canvasRef}
      width={260}
      height={60}
      style={{ width: 260, height: 60, opacity: visible ? 1 : 0, transition: "opacity 0.4s" }}
    />
  );
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter");
  const [beatVisible, setBeatVisible] = useState(false);

  useEffect(() => {
    // Fade in
    const t1 = setTimeout(() => setPhase("show"), 80);
    // Play heartbeat + show line
    const t2 = setTimeout(() => {
      playHeartbeat(false);
      setBeatVisible(true);
    }, 500);
    // Start exit
    const t3 = setTimeout(() => setPhase("exit"), 2600);
    // Done
    const t4 = setTimeout(() => onDone(), 3050);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDone]);

  const opacity = phase === "show" ? 1 : 0;
  const scale   = phase === "show" ? 1 : phase === "enter" ? 0.97 : 1.02;

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "linear-gradient(160deg, #1a0810 0%, #2d0820 40%, #1a0510 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      overflow: "hidden",
    }}>
      {/* Background glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 55% at 50% 45%, rgba(180,20,80,0.25) 0%, transparent 70%)",
      }} />

      {/* Hands illustration */}
      <div style={{
        position: "relative", width: "100%", maxWidth: 340,
        opacity, transform: `scale(${scale})`,
        transition: "opacity 0.55s ease, transform 0.55s cubic-bezier(0.22,1,0.36,1)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
      }}>
        {/* Hands SVG — two hands reaching toward each other */}
        <div style={{ width: 240, height: 240, position: "relative", flexShrink: 0 }}>
          <svg viewBox="0 0 240 240" width="240" height="240" style={{ overflow: "visible" }}>
            <defs>
              <radialGradient id="handGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(200,40,90,0.18)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <filter id="softBlur">
                <feGaussianBlur stdDeviation="1.5" />
              </filter>
            </defs>

            {/* Ambient glow */}
            <ellipse cx="120" cy="125" rx="85" ry="70" fill="url(#handGlow)" />

            {/* ── LEFT HAND (top-left, reaching down-right) ── */}
            <g transform="rotate(-38, 120, 120)">
              {/* Wrist / palm */}
              <path
                d="M60,30 C55,28 50,32 50,38 L52,105 C52,110 56,114 62,114 L80,114 C86,114 90,110 90,105 L88,38 C88,32 83,28 78,30 Z"
                fill="rgba(140,20,55,0.88)" stroke="rgba(180,60,100,0.35)" strokeWidth="0.8"
              />
              {/* Fingers */}
              {/* Index */}
              <path d="M62,38 C60,38 58,36 58,32 L58,12 C58,8 62,6 65,8 L67,32 C68,36 66,38 64,38 Z"
                fill="rgba(145,22,58,0.90)" stroke="rgba(180,60,100,0.3)" strokeWidth="0.7"/>
              {/* Middle */}
              <path d="M70,37 C68,37 66,35 66,31 L66,6 C66,2 70,0 73,2 L75,31 C76,35 74,37 72,37 Z"
                fill="rgba(148,24,60,0.90)" stroke="rgba(180,60,100,0.3)" strokeWidth="0.7"/>
              {/* Ring */}
              <path d="M78,38 C76,38 74,36 74,32 L74,10 C74,6 78,4 81,6 L82,32 C83,36 81,38 79,38 Z"
                fill="rgba(143,21,56,0.88)" stroke="rgba(180,60,100,0.3)" strokeWidth="0.7"/>
              {/* Pinky */}
              <path d="M85,41 C83,41 81,39 81,35 L81,20 C81,16 85,15 87,17 L88,35 C89,39 87,41 86,41 Z"
                fill="rgba(138,18,53,0.85)" stroke="rgba(180,60,100,0.3)" strokeWidth="0.7"/>
              {/* Thumb */}
              <path d="M55,60 C50,58 46,62 48,67 L54,86 C56,91 61,92 64,88 L68,70 C69,65 63,58 57,60 Z"
                fill="rgba(140,20,55,0.87)" stroke="rgba(180,60,100,0.3)" strokeWidth="0.7"/>
              {/* Bracelet */}
              <rect x="53" y="95" width="36" height="5" rx="2.5"
                fill="none" stroke="rgba(210,120,140,0.60)" strokeWidth="1.5"/>
              <rect x="53" y="100" width="36" height="3" rx="1.5"
                fill="none" stroke="rgba(210,120,140,0.35)" strokeWidth="0.8"/>
            </g>

            {/* ── RIGHT HAND (bottom-right, reaching up-left) ── */}
            <g transform="rotate(142, 120, 120)">
              <path
                d="M60,30 C55,28 50,32 50,38 L52,105 C52,110 56,114 62,114 L80,114 C86,114 90,110 90,105 L88,38 C88,32 83,28 78,30 Z"
                fill="rgba(120,15,48,0.82)" stroke="rgba(160,50,85,0.30)" strokeWidth="0.8"
              />
              {/* Index */}
              <path d="M62,38 C60,38 58,36 58,32 L58,12 C58,8 62,6 65,8 L67,32 C68,36 66,38 64,38 Z"
                fill="rgba(125,16,50,0.83)" stroke="rgba(160,50,85,0.25)" strokeWidth="0.7"/>
              {/* Middle */}
              <path d="M70,37 C68,37 66,35 66,31 L66,6 C66,2 70,0 73,2 L75,31 C76,35 74,37 72,37 Z"
                fill="rgba(128,18,52,0.83)" stroke="rgba(160,50,85,0.25)" strokeWidth="0.7"/>
              {/* Ring */}
              <path d="M78,38 C76,38 74,36 74,32 L74,10 C74,6 78,4 81,6 L82,32 C83,36 81,38 79,38 Z"
                fill="rgba(123,15,49,0.82)" stroke="rgba(160,50,85,0.25)" strokeWidth="0.7"/>
              {/* Pinky */}
              <path d="M85,41 C83,41 81,39 81,35 L81,20 C81,16 85,15 87,17 L88,35 C89,39 87,41 86,41 Z"
                fill="rgba(118,13,46,0.79)" stroke="rgba(160,50,85,0.25)" strokeWidth="0.7"/>
              {/* Thumb */}
              <path d="M55,60 C50,58 46,62 48,67 L54,86 C56,91 61,92 64,88 L68,70 C69,65 63,58 57,60 Z"
                fill="rgba(120,15,48,0.80)" stroke="rgba(160,50,85,0.25)" strokeWidth="0.7"/>
              {/* Ring */}
              <circle cx="70" cy="102" r="3.5" fill="none"
                stroke="rgba(210,120,140,0.55)" strokeWidth="1.4"/>
            </g>

            {/* Touch glow at fingertip meeting point */}
            <radialGradient id="touchGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,140,180,0.50)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <ellipse cx="120" cy="118" rx="22" ry="22" fill="url(#touchGlow)">
              <animate attributeName="rx" values="18;26;18" dur="2.4s" repeatCount="indefinite"/>
              <animate attributeName="ry" values="18;26;18" dur="2.4s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.7;1;0.7" dur="2.4s" repeatCount="indefinite"/>
            </ellipse>
          </svg>
        </div>

        {/* App name */}
        <div style={{ textAlign: "center", marginTop: -8 }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700, fontSize: 38, letterSpacing: "-0.03em",
            color: "rgba(255,240,248,0.96)", margin: 0, lineHeight: 1,
          }}>
            Touché
          </p>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 300, fontSize: 11, letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(220,130,160,0.65)", margin: "10px 0 0",
          }}>
            for two
          </p>
        </div>

        {/* Heartbeat line */}
        <div style={{ marginTop: 28, opacity: beatVisible ? 1 : 0, transition: "opacity 0.4s 0.1s" }}>
          <HeartbeatLine color="rgb(210,80,130)" visible={beatVisible} />
        </div>
      </div>
    </div>
  );
}
