import smokeImg from "@/assets/smoke-bg.png";
import { SMOKE_DEFAULT, type SmokeTint } from "@/theme/palette";

/**
 * Full-bleed animated background: deep near-black base with a slowly
 * rising, looping smoke texture (variant "A" — ruby + gold), used behind
 * every main screen instead of a flat color.
 *
 * `tint` color-grades the same smoke asset per mood/category (soft yellow
 * for tenderness, warm amber for desire, bright red for passion, etc.)
 * via a CSS filter, instead of shipping a separate image per category.
 */
export default function SmokeBackground({ tint = SMOKE_DEFAULT }: { tint?: SmokeTint }) {
  const filter = `hue-rotate(${tint.hue}deg) saturate(${tint.saturate}) brightness(${tint.brightness})`;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        zIndex: 0,
        pointerEvents: "none",
        background: "radial-gradient(ellipse 120% 90% at 50% 30%, #200810 0%, #130408 55%, #0a0205 100%)",
      }}
    >
      <div style={{ position: "absolute", inset: 0, filter, transition: "filter .6s ease" }}>
        {/* rising smoke layer 1 */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "200%",
            backgroundImage: `url(${smokeImg})`,
            backgroundSize: "100% 50%",
            backgroundRepeat: "repeat-y",
            backgroundPosition: "center top",
            opacity: 0.55,
            mixBlendMode: "screen",
            animation: "smokeRise1 46s linear infinite",
            willChange: "transform",
          }}
        />
        {/* rising smoke layer 2 — slower, mirrored, softer, for parallax depth */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "200%",
            backgroundImage: `url(${smokeImg})`,
            backgroundSize: "140% 50%",
            backgroundRepeat: "repeat-y",
            backgroundPosition: "center top",
            opacity: 0.28,
            transform: "scaleX(-1)",
            mixBlendMode: "screen",
            animation: "smokeRise2 74s linear infinite",
            willChange: "transform",
          }}
        />
      </div>
      {/* warm vignette so the smoke stays moody, not washed out */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 90% 70% at 50% 42%, transparent 0%, rgba(10,3,5,0.35) 68%, rgba(6,2,3,0.72) 100%)",
        }}
      />
      {/* readability scrim, top and bottom */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(8,3,4,0.30) 0%, transparent 22%, transparent 72%, rgba(6,2,3,0.42) 100%)",
        }}
      />
    </div>
  );
}
