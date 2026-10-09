import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const raw = Number(new URL(req.url).searchParams.get("size"));
  const s = [180, 192, 512].includes(raw) ? raw : 512;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg,#E91E63,#C2185B)",
          color: "#ffffff",
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
