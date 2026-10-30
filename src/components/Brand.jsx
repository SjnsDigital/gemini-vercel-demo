import React from "react";
import brandLogo from "../assets/brand-logo-transparent.svg";
import "./brand.css";

export { brandLogo };
export default function Brand({ className = "", compact = false }) {
  return (
    <span
      className={`brand-official ${compact ? "brand-official-compact " : ""}${className}`}
      style={{ "--brand-mask": `url("${brandLogo}")` }}
    >
      <img
        src={brandLogo}
        width="720"
        height="278"
        alt="Kim Solar — Năng lượng xanh, giá trị bền vững"
        decoding="async"
        draggable="false"
      />
    </span>
  );
}
