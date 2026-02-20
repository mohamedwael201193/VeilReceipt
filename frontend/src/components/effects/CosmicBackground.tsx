// Cosmic Background Effects — 3D vortex, particles, grid, aurora

import { FC, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

// Animated cosmic vortex SVG (hero centerpiece)
export const CosmicVortex: FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
    <svg
      viewBox="0 0 800 800"
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] opacity-60"
    >
      <defs>
        <radialGradient id="vortexCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" />
          <stop offset="40%" stopColor="#020617" />
          <stop offset="70%" stopColor="#0c1a3a" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="glowBlue" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.1" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="heavyGlow">
          <feGaussianBlur stdDeviation="8" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Deep black core */}
      <circle cx="400" cy="400" r="120" fill="url(#vortexCore)" />

      {/* Spiral rings */}
      {[...Array(6)].map((_, i) => (
        <motion.ellipse
          key={`ring-${i}`}
          cx="400"
          cy="400"
          rx={160 + i * 45}
          ry={60 + i * 18}
          fill="none"
          stroke={i % 2 === 0 ? '#38bdf8' : '#818cf8'}
          strokeWidth={1.5 - i * 0.15}
          strokeOpacity={0.3 - i * 0.03}
          filter="url(#glow)"
          initial={{ rotate: i * 30 }}
          animate={{ rotate: i * 30 + 360 }}
          transition={{
            duration: 20 + i * 8,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{ transformOrigin: '400px 400px' }}
        />
      ))}

      {/* Bright inner accretion ring */}
      <motion.ellipse
        cx="400"
        cy="400"
        rx="140"
        ry="50"
        fill="none"
        stroke="url(#glowBlue)"
        strokeWidth="30"
        filter="url(#heavyGlow)"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '400px 400px' }}
      />

      {/* Streaking light arcs */}
      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const r1 = 180;
        const r2 = 350;
        return (
          <motion.line
            key={`streak-${i}`}
            x1={400 + Math.cos(angle) * r1}
            y1={400 + Math.sin(angle) * r1 * 0.35}
            x2={400 + Math.cos(angle) * r2}
            y2={400 + Math.sin(angle) * r2 * 0.35}
            stroke="#38bdf8"
            strokeWidth="0.5"
            strokeOpacity="0.15"
            filter="url(#glow)"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0] }}
            transition={{
              duration: 3,
              delay: i * 0.25,
              repeat: Infinity,
            }}
          />
        );
      })}
    </svg>
  </div>
);

// Floating 3D particles
export const FloatingParticles: FC<{ count?: number; className?: string }> = ({
  count = 60,
  className = '',
}) => {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 0.5,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 10,
    opacity: Math.random() * 0.6 + 0.1,
    color: Math.random() > 0.7 ? '#e879f9' : Math.random() > 0.4 ? '#38bdf8' : '#ffffff',
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
          }}
          animate={{
            y: [0, -30, 10, -20, 0],
            x: [0, 15, -10, 5, 0],
            opacity: [p.opacity, p.opacity * 1.5, p.opacity * 0.5, p.opacity * 1.2, p.opacity],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

// Animated grid backdrop
export const GridBackground: FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
    <svg width="100%" height="100%" className="opacity-[0.04]">
      <defs>
        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#38bdf8" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
    {/* Perspective fade overlay */}
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
  </div>
);

// Animated aurora glow
export const AuroraGlow: FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
    <motion.div
      className="absolute -top-[40%] left-[10%] w-[80%] h-[60%] rounded-full blur-[120px]"
      style={{
        background: 'radial-gradient(ellipse, rgba(56,189,248,0.15) 0%, rgba(129,140,248,0.08) 50%, transparent 70%)',
      }}
      animate={{
        scale: [1, 1.1, 0.95, 1.05, 1],
        x: [0, 30, -20, 10, 0],
      }}
      transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute -top-[30%] right-[5%] w-[50%] h-[50%] rounded-full blur-[100px]"
      style={{
        background: 'radial-gradient(ellipse, rgba(217,70,239,0.1) 0%, rgba(168,85,247,0.05) 50%, transparent 70%)',
      }}
      animate={{
        scale: [1, 0.9, 1.1, 0.95, 1],
        x: [0, -20, 15, -5, 0],
      }}
      transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
    />
  </div>
);

// Glowing orb with 3D parallax
export const GlowOrb: FC<{
  color?: string;
  size?: number;
  position?: { top?: string; left?: string; right?: string; bottom?: string };
  className?: string;
}> = ({ color = '#38bdf8', size = 300, position = {}, className = '' }) => (
  <motion.div
    className={`absolute rounded-full pointer-events-none blur-[80px] ${className}`}
    style={{
      ...position,
      width: size,
      height: size,
      background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
    }}
    animate={{
      scale: [1, 1.2, 0.9, 1.1, 1],
      opacity: [0.4, 0.6, 0.3, 0.5, 0.4],
    }}
    transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
  />
);

// Animated SVG shield icon for sections
export const ShieldAnimation: FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 120,
}) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    className={className}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.8, type: 'spring' }}
  >
    <defs>
      <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="50%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#e879f9" />
      </linearGradient>
      <filter id="shieldGlow">
        <feGaussianBlur stdDeviation="3" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <motion.path
      d="M60 10 L100 25 L100 55 C100 80 80 95 60 105 C40 95 20 80 20 55 L20 25 Z"
      fill="none"
      stroke="url(#shieldGrad)"
      strokeWidth="2"
      filter="url(#shieldGlow)"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 2, ease: 'easeInOut' }}
    />
    <motion.path
      d="M60 22 L90 34 L90 55 C90 75 75 87 60 95 C45 87 30 75 30 55 L30 34 Z"
      fill="url(#shieldGrad)"
      fillOpacity="0.08"
      stroke="url(#shieldGrad)"
      strokeWidth="0.5"
      strokeOpacity="0.3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1, duration: 1 }}
    />
    {/* Lock icon inside shield */}
    <motion.g
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5, duration: 0.5 }}
    >
      <rect x="50" y="52" width="20" height="16" rx="3" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
      <path d="M55 52 V47 A5 5 0 0 1 65 47 V52" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="2" fill="#38bdf8" />
    </motion.g>
  </motion.svg>
);

// Canvas-based particle field for performance
export const ParticleField: FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    const init = () => {
      resize();
      const count = Math.min(80, Math.floor((canvas.offsetWidth * canvas.offsetHeight) / 15000));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.offsetWidth,
          y: Math.random() * canvas.offsetHeight,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 1.5 + 0.5,
          alpha: Math.random() * 0.5 + 0.1,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.offsetWidth;
        if (p.x > canvas.offsetWidth) p.x = 0;
        if (p.y < 0) p.y = canvas.offsetHeight;
        if (p.y > canvas.offsetHeight) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha})`;
        ctx.fill();
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    init();
    draw();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
};

// Glassmorphism card border effect
export const GlassCard: FC<{
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}> = ({ children, className = '', glow = false }) => (
  <div className={`relative group ${className}`}>
    {glow && (
      <div className="absolute -inset-[1px] bg-gradient-to-r from-sky-500/20 via-purple-500/20 to-fuchsia-500/20 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    )}
    <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden">
      {children}
    </div>
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
