import { ImageResponse } from "next/og";

export const alt = "JobTrackr — Track every job application";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#FDFDFD",
          color: "#1a1a1a",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 132,
            height: 132,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 32,
            background: "#1a1a1a",
            color: "#ffffff",
            fontSize: 84,
            fontWeight: 800,
          }}
        >
          J
        </div>
        <div style={{ marginTop: 40, fontSize: 88, fontWeight: 800, letterSpacing: -2 }}>
          JobTrackr
        </div>
        <div style={{ marginTop: 12, fontSize: 34, color: "#595959" }}>
          Track every job application
        </div>
      </div>
    ),
    { ...size },
  );
}
