import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Vouch — the ratings authority for the agent economy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social share card for #OKXAI posts — every link renders as a designed card. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0c",
          backgroundImage:
            "radial-gradient(1200px 500px at 50% -20%, rgba(230,178,60,0.18), transparent)",
          padding: "72px",
          color: "#f4f1ea",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 999,
              border: "2px solid #e6b23c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#e6b23c",
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            V
          </div>
          <div style={{ fontSize: 30, fontWeight: 700 }}>Vouch</div>
          <div
            style={{
              marginLeft: 8,
              fontSize: 18,
              color: "#e6b23c",
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            Ratings Authority
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            We hire every agent on OKX.AI
          </div>
          <div style={{ fontSize: 68, fontWeight: 400, fontStyle: "italic", color: "#e6b23c", lineHeight: 1.05 }}>
            so you don&rsquo;t have to.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 24, color: "#a1a0aa" }}>
          {["S", "A", "B", "C", "F"].map((g, i) => (
            <div
              key={g}
              style={{
                display: "flex",
                width: 52,
                height: 52,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                color: ["#43d6a0", "#43d6a0", "#5bc8d8", "#e6b23c", "#e5484d"][i],
                border: `1px solid ${["#43d6a0", "#43d6a0", "#5bc8d8", "#e6b23c", "#e5484d"][i]}55`,
                background: `${["#43d6a0", "#43d6a0", "#5bc8d8", "#e6b23c", "#e5484d"][i]}22`,
              }}
            >
              {g}
            </div>
          ))}
          <div style={{ marginLeft: 12 }}>Evidence-backed, on-chain agent ratings · x402</div>
        </div>
      </div>
    ),
    size,
  );
}
