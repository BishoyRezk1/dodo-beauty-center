import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const raw = Number(u.searchParams.get("size"));
  const s = [180, 192, 512].includes(raw) ? raw : 512;
  const admin = u.searchParams.get("v") === "admin";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: admin ? "linear-gradient(135deg,#4A2C35,#2B1A20)" : "linear-gradient(135deg,#E91E63,#C2185B)",
          color: admin ? "#FFD9E8" : "#ffffff",
          fontSize: Math.round(s * 0.55),
          fontWeight: 800
        }}
      >
        Z
      </div>
    ),
    { width: s, height: s }
  );
}
