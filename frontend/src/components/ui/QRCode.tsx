// QR Code Generator — Renders payment link URLs as scannable QR codes
// Uses a lightweight canvas-based approach (no external QR library needed).

import { FC, useEffect, useRef } from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

// Lightweight QR code generation using the QR Code API
// Falls back to a styled placeholder if the image fails to load
const QRCode: FC<QRCodeProps> = ({ value, size = 200, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use Google Charts QR API (widely available, no library needed)
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const encodedValue = encodeURIComponent(value);
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedValue}&bgcolor=1c1b1b&color=7dffa2&format=png`;

    img.onload = () => {
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);
    };

    img.onerror = () => {
      // Fallback: draw a minimal placeholder
      canvas.width = size;
      canvas.height = size;
      ctx.fillStyle = '#1c1b1b';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#7dffa2';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('QR Code', size / 2, size / 2 - 8);
      ctx.fillStyle = '#c9c6c5';
      ctx.font = '10px monospace';
      ctx.fillText(value.slice(0, 30) + '...', size / 2, size / 2 + 12);
    };
  }, [value, size]);

  return (
    <div className={`inline-flex p-3 bg-[#1c1b1b] border border-[#d4bbff]/10 rounded-xl ${className}`}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-lg"
      />
    </div>
  );
};

export default QRCode;
