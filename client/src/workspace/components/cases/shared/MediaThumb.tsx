import type { CSSProperties } from "react";
import { isVideoFile } from "../utils";

interface MediaThumbProps {
  url?: string;
  alt?: string;
  mediaType?: "feed" | "stories" | "reels" | "carousel";
  style?: CSSProperties;
}

export default function MediaThumb({
  url,
  alt = "",
  mediaType = "feed",
  style,
}: MediaThumbProps) {
  const video = isVideoFile(url);

  const fallbackIcon =
    mediaType === "reels"
      ? "🎬"
      : mediaType === "carousel"
      ? "🎠"
      : mediaType === "stories"
      ? "📲"
      : "🖼";

  if (!url) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--ws-surface2)",
          ...style,
        }}
      >
        <span style={{ fontSize: "1.4rem" }}>{fallbackIcon}</span>
      </div>
    );
  }

  if (video) {
    return (
      <video
        src={url}
        muted
        playsInline
        preload="metadata"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          background: "#000",
          ...style,
        }}
      />
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
        ...style,
      }}
    />
  );
}
