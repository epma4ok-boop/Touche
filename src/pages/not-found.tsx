export default function NotFound() {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#030508",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16,
    }}>
      <p style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontStyle: "italic", fontWeight: 300, fontSize: 24,
        color: "rgba(255,252,245,0.5)", margin: 0, letterSpacing: "0.04em",
      }}>
        404
      </p>
      <p style={{
        fontFamily: "'Raleway', sans-serif", fontWeight: 200, fontSize: 10,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "rgba(255,255,255,0.2)", margin: 0,
      }}>
        not found
      </p>
    </div>
  );
}
