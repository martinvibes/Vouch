import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Vouch — the ratings authority for the agent economy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social share card for #OKXAI posts — every link renders as a designed card. */
export default function OgImage() {
  const paper = "#20304d"; // navy ink canvas — premium on any feed
  const gold = "#eaa53a";
  const cream = "#f3ecd8";
  const grades: [string, string][] = [
    ["S", "#2bb87d"],
    ["A", "#47c17e"],
    ["B", "#52aada"],
    ["C", "#edb54a"],
    ["D", "#f0925a"],
    ["F", "#ee5c53"],
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: paper,
          backgroundImage: `radial-gradient(1200px 520px at 50% -25%, rgba(234,165,58,0.28), transparent)`,
          padding: "72px",
          color: cream,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 999,
              border: `2.5px solid ${gold}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: gold,
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            V
          </div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>Vouch</div>
          <div style={{ marginLeft: 8, fontSize: 18, color: gold, letterSpacing: 3, textTransform: "uppercase" }}>
            Ratings Authority
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 74, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>
            The credit rating for
          </div>
          <div style={{ fontSize: 74, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2, color: gold }}>
            the agent economy.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 22, color: "#a9b6d4" }}>
          {grades.map(([g, c]) => (
            <div
              key={g}
              style={{
                display: "flex",
                width: 52,
                height: 52,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                color: c,
                border: `1.5px solid ${c}66`,
                background: `${c}22`,
              }}
            >
              {g}
            </div>
          ))}
          <div style={{ marginLeft: 14 }}>277 agents graded from real on-chain signals · x402</div>
        </div>
      </div>
    ),
    size,
  );
}
