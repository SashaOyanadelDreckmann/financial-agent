"use client";
import React from "react";

type Props = {
  label?: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  title?: string;

  /* 🎨 NUEVO */
  bgImage?: string;
  overlayOpacity?: number; // 0 → 1
  overlayColor?: string;   // ej: '0,0,0' o '255,255,255'
  bgScale?: number;        // ej: 1, 1.1, 1.25
  bgPosition?: string;     // ej: 'center', 'top', '50% 30%'
};

export default function PanelCard({
  label,
  value,
  children,
  className = "",
  title,

  bgImage,
  overlayOpacity = 0.45,
  overlayColor = "0,0,0",
  bgScale = 1.05,
  bgPosition = "center",
}: Props) {
  return (
    <div
      className={`panel-card ${className}`.trim()}
      style={
        bgImage
          ? ({
              ["--card-bg" as any]: `url('${bgImage}')`,
              ["--overlay-opacity" as any]: overlayOpacity,
              ["--overlay-color" as any]: overlayColor,
              ["--bg-scale" as any]: bgScale,
              ["--bg-position" as any]: bgPosition,
            } as React.CSSProperties)
          : undefined
      }
    >
      {label && <span className="panel-label">{label}</span>}
      {value !== undefined && <div className="panel-value">{value}</div>}
      {title && <div className="panel-value">{title}</div>}
      {children && <div className="panel-text">{children}</div>}
    </div>
  );
}
