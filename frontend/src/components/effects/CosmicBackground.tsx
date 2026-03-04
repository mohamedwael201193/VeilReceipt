// Background Effects — Minimal grid + animated counter

import { FC } from 'react';
import { motion } from 'framer-motion';

// Subtle grid backdrop
export const GridBackground: FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
    <svg width="100%" height="100%" className="opacity-[0.03]">
      <defs>
        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#ffffff" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
  </div>
);

// Animated counter
export const AnimatedCounter: FC<{ value: number; className?: string }> = ({
  value,
  className = '',
}) => (
  <motion.span
    className={className}
    key={value}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ type: 'spring', stiffness: 200 }}
  >
    {value}
  </motion.span>
);
