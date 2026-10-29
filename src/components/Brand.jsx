import React from "react";
import brandLogo from "../assets/brand-logo.png";

export { brandLogo };
export default function Brand({ className = "", compact = false }) {
  return (
    <span
      className={`brand-official ${compact ? "brand-official-compact " : ""}${className}`}
    >
      <img
        src={brandLogo}
        width="720"
        height="278"
        alt="Kim Solar — Năng lượng xanh, giá trị bền vững"
        decoding="async"
      />
    </span>
  );
}
