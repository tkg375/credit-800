import { ImageResponse } from "next/og";

export const alt = "Credit 800 — Smarter Credit Repair";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #84cc16 0%, #14b8a6 50%, #06b6d4 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
          }}
        >
          <div
            style={{
              fontSize: "80px",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-2px",
              lineHeight: 1,
            }}
          >
            Credit 800
          </div>
          <div
            style={{
              fontSize: "32px",
              color: "rgba(255,255,255,0.9)",
              fontWeight: 500,
            }}
          >
            Smarter Credit Repair — Free
          </div>
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "8px",
            }}
          >
            {["Dispute Letters", "Score Analysis", "Budget Tracker", "Loan Readiness"].map((f) => (
              <div
                key={f}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: "999px",
                  padding: "8px 20px",
                  color: "white",
                  fontSize: "18px",
                  fontWeight: 600,
                }}
              >
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
