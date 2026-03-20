// VeilLogo — Custom SVG logo for VeilReceipt
// A shield with a privacy veil + receipt curl, animated gradient

import { FC, useId } from 'react';

interface VeilLogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export const VeilLogo: FC<VeilLogoProps> = ({ size = 32, className = '', animated = true }) => {
  const id = useId();
  const gradId = `veil-grad-${id}`;
  const glowId = `veil-glow-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d4bbff">
            {animated && <animate attributeName="stop-color" values="#d4bbff;#7dffa2;#d4bbff" dur="4s" repeatCount="indefinite" />}
          </stop>
          <stop offset="100%" stopColor="#7dffa2">
            {animated && <animate attributeName="stop-color" values="#7dffa2;#d4bbff;#7dffa2" dur="4s" repeatCount="indefinite" />}
          </stop>
        </linearGradient>
        <filter id={glowId}>
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Shield body */}
      <path
        d="M32 4L8 16v16c0 14.4 10.24 27.84 24 32 13.76-4.16 24-17.6 24-32V16L32 4z"
        fill="#0e0d0d"
        stroke={`url(#${gradId})`}
        strokeWidth="2"
        filter={animated ? `url(#${glowId})` : undefined}
      />

      {/* Inner shield highlight */}
      <path
        d="M32 10L14 19v11c0 11.52 8.19 22.27 18 25.6V10z"
        fill="#d4bbff"
        opacity="0.04"
      />

      {/* Privacy veil — three flowing lines */}
      <path d="M20 26c4-3 8 3 12 0s8 3 12 0" stroke={`url(#${gradId})`} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7">
        {animated && <animate attributeName="d" values="M20 26c4-3 8 3 12 0s8 3 12 0;M20 26c4 3 8-3 12 0s8-3 12 0;M20 26c4-3 8 3 12 0s8 3 12 0" dur="3s" repeatCount="indefinite" />}
      </path>
      <path d="M20 32c4-3 8 3 12 0s8 3 12 0" stroke={`url(#${gradId})`} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5">
        {animated && <animate attributeName="d" values="M20 32c4-3 8 3 12 0s8 3 12 0;M20 32c4 3 8-3 12 0s8-3 12 0;M20 32c4-3 8 3 12 0s8 3 12 0" dur="3s" begin="0.3s" repeatCount="indefinite" />}
      </path>
      <path d="M22 38c3-2 6 2 10 0s7 2 10 0" stroke={`url(#${gradId})`} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.3">
        {animated && <animate attributeName="d" values="M22 38c3-2 6 2 10 0s7 2 10 0;M22 38c3 2 6-2 10 0s7-2 10 0;M22 38c3-2 6 2 10 0s7 2 10 0" dur="3s" begin="0.6s" repeatCount="indefinite" />}
      </path>

      {/* Lock keyhole at center top */}
      <circle cx="32" cy="20" r="3" stroke={`url(#${gradId})`} strokeWidth="1.5" fill="none" />
      <rect x="31" y="21" width="2" height="3" rx="0.5" fill={`url(#${gradId})`} />

      {/* Receipt curl at bottom */}
      <path d="M28 46v4c0 1.5 1.5 2 2.5 1l1.5-2 1.5 2c1 1 2.5.5 2.5-1v-4" stroke={`url(#${gradId})`} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />
    </svg>
  );
};

/* Smaller inline version for nav / headers */
export const VeilLogoMini: FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <VeilLogo size={size} className={className} animated={false} />
);
