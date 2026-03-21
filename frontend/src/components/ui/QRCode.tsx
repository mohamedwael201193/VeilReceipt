// QR Code Generator — Renders payment link URLs as scannable QR codes
// Uses the qrcode library for reliable client-side generation.

import { FC, useEffect, useRef } from 'react';
import QRCodeLib from 'qrcode';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

const QRCode: FC<QRCodeProps> = ({ value, size = 200, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    QRCodeLib.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: {
        dark: '#e5e2e1',
        light: '#0a0a0a',
      },
      errorCorrectionLevel: 'M',
    }).catch((err) => {
      console.error('QR code generation failed:', err);
    });
  }, [value, size]);

  return (
    <div className={`inline-flex p-4 bg-[#0a0a0a] border border-[#d4bbff]/10 rounded-xl ${className}`}>
      <canvas
        ref={canvasRef}
        className="rounded-lg"
      />
    </div>
  );
};

export default QRCode;
