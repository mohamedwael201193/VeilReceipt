// UI Components — Terminal / Obsidian Intelligence design system

import { FC, ReactNode, ButtonHTMLAttributes, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingSpinner } from '@/components/icons/Icons';

// ========== BUTTON ==========
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'glow';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export const Button: FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const base = 'relative inline-flex items-center justify-center gap-2 font-mono text-xs tracking-widest uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden';

  const variants: Record<string, string> = {
    primary: 'bg-[#d4bbff] text-[#050505] hover:bg-[#d4bbff]/90 font-bold',
    secondary: 'bg-[#1c1b1b] text-[#e5e2e1] border border-[#d4bbff]/20 hover:bg-[#d4bbff]/10 hover:border-[#d4bbff]/40',
    ghost: 'text-[#c9c6c5] hover:text-[#e5e2e1] hover:bg-[#1c1b1b]',
    danger: 'bg-[#ffb4ab]/10 text-[#ffb4ab] border border-[#ffb4ab]/20 hover:bg-[#ffb4ab]/20',
    glow: 'bg-[#7dffa2] text-[#050505] hover:bg-[#7dffa2]/90 font-bold shadow-[0_0_20px_rgba(125,255,162,0.15)] hover:shadow-[0_0_30px_rgba(125,255,162,0.25)]',
  };

  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-[10px]',
    md: 'px-5 py-2.5 text-xs',
    lg: 'px-7 py-3.5 text-xs',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoadingSpinner size={14} /> : icon}
      {children}
    </button>
  );
};

// ========== CARD (Spotlight + BorderBeam) ==========
interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  spotlight?: boolean;
  beam?: boolean;
  beamColor?: { from: string; to: string };
  tilt?: boolean;
  onClick?: () => void;
}

export const Card: FC<CardProps> = ({
  children, className = '', hover = false, glow = false,
  spotlight = true, beam = false, tilt = false,
  beamColor, onClick,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [tiltStyle, setTiltStyle] = useState({});

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
    if (tilt) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -4;
      const rotateY = ((x - centerX) / centerX) * 4;
      setTiltStyle({ transform: `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)` });
    }
  }, [tilt]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (tilt) setTiltStyle({ transform: 'perspective(800px) rotateX(0deg) rotateY(0deg)' });
  }, [tilt]);

  const Wrapper = onClick ? motion.button : motion.div;

  return (
    <Wrapper
      ref={cardRef as any}
      className={`relative group overflow-hidden rounded-2xl border border-[#d4bbff]/[0.08] p-6 transition-all duration-500 ${
        hover ? 'cursor-pointer' : ''
      } ${glow ? 'hover:border-[#7dffa2]/25' : ''} ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(28,27,27,0.7) 0%, rgba(10,10,10,0.8) 100%)',
        backdropFilter: 'blur(12px)',
        ...(tilt ? { ...tiltStyle, transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.4s ease-out' } : {}),
      }}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      whileHover={hover ? { y: -6, transition: { type: 'spring', stiffness: 400, damping: 25 } } : undefined}
      whileTap={hover ? { scale: 0.98 } : undefined}
    >
      {/* Spotlight glow following cursor */}
      {spotlight && isHovered && (
        <div
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(500px circle at ${mousePos.x}px ${mousePos.y}px, ${
              glow ? 'rgba(125,255,162,0.06)' : 'rgba(212,187,255,0.06)'
            }, transparent 45%)`,
          }}
        />
      )}

      {/* Top-edge shimmer line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4bbff]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Border Beam animation */}
      {beam && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ borderRadius: 'inherit' }}>
          <div
            className="absolute inset-0"
            style={{
              background: `conic-gradient(from calc(var(--card-beam) * 1deg), transparent 60%, ${beamColor?.from || '#d4bbff'}, ${beamColor?.to || '#7dffa2'}, transparent 80%)`,
              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              maskComposite: 'exclude',
              WebkitMaskComposite: 'xor',
              padding: '1.5px',
              animation: 'card-beam-spin 12s linear infinite',
            }}
          />
        </div>
      )}

      {/* Glass noise overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.015] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '128px' }} />

      {/* Inner glow on hover */}
      <div className={`absolute inset-0 pointer-events-none rounded-2xl transition-all duration-700 ${
        glow
          ? 'group-hover:shadow-[inset_0_0_60px_rgba(125,255,162,0.04)]'
          : 'group-hover:shadow-[inset_0_0_60px_rgba(212,187,255,0.03)]'
      }`} />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </Wrapper>
  );
};

// ========== BADGE ==========
interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple';
  className?: string;
  dot?: boolean;
}

export const Badge: FC<BadgeProps> = ({ children, variant = 'default', className = '', dot = false }) => {
  const variants: Record<string, string> = {
    default: 'bg-[#1c1b1b] text-[#c9c6c5] border-[#c9c6c5]/20',
    success: 'bg-[#7dffa2]/10 text-[#7dffa2] border-[#7dffa2]/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    error: 'bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/20',
    info: 'bg-[#7dffa2]/10 text-[#7dffa2] border-[#7dffa2]/20',
    purple: 'bg-[#d4bbff]/10 text-[#d4bbff] border-[#d4bbff]/20',
  };

  const dotColors: Record<string, string> = {
    default: 'bg-[#c9c6c5]',
    success: 'bg-[#7dffa2]',
    warning: 'bg-amber-400',
    error: 'bg-[#ffb4ab]',
    info: 'bg-[#7dffa2]',
    purple: 'bg-[#d4bbff]',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono tracking-widest uppercase border rounded-full ${variants[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};

// ========== INPUT ==========
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input: FC<InputProps> = ({ label, error, icon, className = '', ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="block text-[10px] font-mono tracking-widest uppercase text-[#c9c6c5]">{label}</label>}
    <div className="relative">
      {icon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c9c6c5]/40">{icon}</span>}
      <input
        className={`w-full bg-[#1c1b1b]/60 border border-[#d4bbff]/10 rounded-xl px-4 py-2.5 text-[#e5e2e1] font-mono text-sm placeholder-[#c9c6c5]/30 focus:border-[#d4bbff]/40 focus:bg-[#1c1b1b] focus:ring-1 focus:ring-[#d4bbff]/20 transition-all ${
          icon ? 'pl-10' : ''
        } ${error ? 'border-[#ffb4ab]/50' : ''} ${className}`}
        {...props}
      />
    </div>
    {error && <p className="text-[10px] font-mono text-[#ffb4ab]">{error}</p>}
  </div>
);

// ========== SELECT ==========
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select: FC<SelectProps> = ({ label, error, options, className = '', ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="block text-[10px] font-mono tracking-widest uppercase text-[#c9c6c5]">{label}</label>}
    <select
      className={`w-full bg-[#1c1b1b]/60 border border-[#d4bbff]/10 rounded-xl px-4 py-2.5 text-[#e5e2e1] font-mono text-sm focus:border-[#d4bbff]/40 focus:ring-1 focus:ring-[#d4bbff]/20 transition-all ${
        error ? 'border-[#ffb4ab]/50' : ''
      } ${className}`}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-[#050505] text-[#e5e2e1]">
          {opt.label}
        </option>
      ))}
    </select>
    {error && <p className="text-[10px] font-mono text-[#ffb4ab]">{error}</p>}
  </div>
);

// ========== CURRENCY SELECT (with logos) ==========
const CURRENCY_OPTIONS = [
  { value: 'credits', label: 'Aleo Credits', logo: '/aleoicon.png' },
  { value: 'usdcx', label: 'USDCx Stablecoin', logo: '/usdcx.svg' },
  { value: 'usad', label: 'USAD Stablecoin', logo: '/USAD.svg' },
];

interface CurrencySelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export const CurrencySelect: FC<CurrencySelectProps> = ({ label, value, onChange, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = CURRENCY_OPTIONS.find(o => o.value === value) || CURRENCY_OPTIONS[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="space-y-1.5" ref={ref}>
      {label && <label className="block text-[10px] font-mono tracking-widest uppercase text-[#c9c6c5]">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center gap-3 bg-[#1c1b1b]/60 border rounded-xl px-4 py-2.5 text-left transition-all ${
            isOpen ? 'border-[#d4bbff]/40 ring-1 ring-[#d4bbff]/20' : 'border-[#d4bbff]/10 hover:border-[#d4bbff]/20'
          } ${error ? 'border-[#ffb4ab]/50' : ''}`}
        >
          <img src={selected.logo} alt={selected.label} className="w-5 h-5 rounded-full object-contain" />
          <span className="flex-1 text-[#e5e2e1] font-mono text-sm">{selected.label}</span>
          <svg className={`w-4 h-4 text-[#c9c6c5]/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 w-full mt-1.5 bg-[#0a0a0a] border border-[#d4bbff]/15 rounded-xl shadow-2xl shadow-black/40 overflow-hidden"
            >
              {CURRENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                    value === opt.value
                      ? 'bg-[#d4bbff]/10 text-[#e5e2e1]'
                      : 'text-[#c9c6c5]/80 hover:bg-[#1c1b1b]/80 hover:text-[#e5e2e1]'
                  }`}
                >
                  <img src={opt.logo} alt={opt.label} className="w-5 h-5 rounded-full object-contain" />
                  <span className="font-mono text-sm">{opt.label}</span>
                  {value === opt.value && (
                    <svg className="w-4 h-4 ml-auto text-[#7dffa2]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {error && <p className="text-[10px] font-mono text-[#ffb4ab]">{error}</p>}
    </div>
  );
};

// ========== MODAL ==========
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export const Modal: FC<ModalProps> = ({ isOpen, onClose, title, children }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-[#050505]/80 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative bg-[#0a0a0a] border border-[#d4bbff]/15 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-mono tracking-widest uppercase text-[#d4bbff]">// {title}</h2>
            <button onClick={onClose} className="text-[#c9c6c5]/40 hover:text-[#e5e2e1] transition-colors text-xl leading-none">&times;</button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ========== EMPTY STATE ==========
interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState: FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-[#d4bbff]/20 mb-5">{icon}</div>
    <h3 className="text-xs font-mono tracking-widest uppercase text-[#e5e2e1]/80 mb-2">{title}</h3>
    {description && <p className="text-[#c9c6c5]/60 mb-6 max-w-md text-sm">{description}</p>}
    {action}
  </div>
);

// ========== STAT CARD ==========
interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  trend?: { value: number; positive: boolean };
  className?: string;
}

export const StatCard: FC<StatCardProps> = ({ label, value, icon, trend, className = '' }) => (
  <Card className={`overflow-hidden ${className}`} tilt spotlight>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-mono tracking-widest uppercase text-[#c9c6c5]">{label}</p>
        <div className="text-2xl font-headline font-bold text-[#e5e2e1] mt-1.5">{value}</div>
        {trend && (
          <p className={`text-[10px] font-mono mt-2 ${trend.positive ? 'text-[#7dffa2]' : 'text-[#ffb4ab]'}`}>
            {trend.positive ? '+' : ''}{trend.value}%
          </p>
        )}
      </div>
      {icon && <div className="text-[#d4bbff]/30 transition-transform duration-500 group-hover:scale-110 group-hover:text-[#d4bbff]/50">{icon}</div>}
    </div>
    {/* Bottom accent line */}
    <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4bbff]/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
  </Card>
);

// ========== PILL NAV ==========
interface PillNavProps<T extends string> {
  tabs: { id: T; label: string; icon?: ReactNode; count?: number }[];
  active: T;
  onChange: (id: T) => void;
}

export function PillNav<T extends string>({ tabs, active, onChange }: PillNavProps<T>) {
  return (
    <div className="inline-flex gap-0 border border-[#d4bbff]/10 bg-[#1c1b1b]/40 rounded-xl overflow-hidden">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative flex items-center gap-2 py-2.5 px-5 font-mono text-[10px] tracking-widest uppercase transition-all ${
            active === tab.id
              ? 'text-[#d4bbff] bg-[#d4bbff]/10 border-b-2 border-[#d4bbff]'
              : 'text-[#c9c6c5]/50 hover:text-[#e5e2e1] hover:bg-[#1c1b1b]'
          }`}
        >
          <span className="relative flex items-center gap-2">
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="bg-[#7dffa2]/10 text-[#7dffa2] text-[9px] px-1.5 py-0.5 font-mono min-w-[1.25rem] text-center">
                {tab.count}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

// ========== SECTION HEADER ==========
export const SectionHeader: FC<{ title: string; subtitle?: string; action?: ReactNode }> = ({
  title,
  subtitle,
  action,
}) => (
  <div className="flex items-end justify-between mb-8">
    <div>
      <p className="text-[10px] font-mono tracking-widest uppercase text-[#7dffa2] mb-2">// DIRECTORY:</p>
      <h1 className="text-2xl font-headline font-bold text-[#e5e2e1] tracking-tight uppercase">{title}</h1>
      {subtitle && <p className="text-[#c9c6c5]/60 mt-1 text-sm">{subtitle}</p>}
    </div>
    {action}
  </div>
);
