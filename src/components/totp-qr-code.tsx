"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function TotpQrCode({ value }: { value: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvas.current) return;
    void QRCode.toCanvas(canvas.current, value, {
      width: 180, margin: 2, errorCorrectionLevel: "M",
      color: { dark: "#0b3d32", light: "#ffffff" },
    }).catch(() => { /* The manual setup key remains available below. */ });
  }, [value]);
  return <canvas ref={canvas} width={180} height={180} role="img" aria-label="کد QR راه‌اندازی احراز هویت دومرحله‌ای" className="rounded-xl border bg-white" />;
}
