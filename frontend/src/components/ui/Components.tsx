// UI Components — Terminal / Obsidian Intelligence design system

import { FC, ReactNode, ButtonHTMLAttributes, useState, useRef, useEffect } from 'react';
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

// ========== CARD ==========
interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  onClick?: () => void;
}

export const Card: FC<CardProps> = ({ children, className = '', hover = false, glow = false, onClick }) => {
  const Wrapper = onClick ? motion.button : motion.div;

  return (
    <Wrapper
      className={`relative group bg-[#1c1b1b]/60 border border-[#d4bbff]/10 rounded-2xl p-6 transition-all duration-300 backdrop-blur-sm ${
        hover ? 'hover:bg-[#1c1b1b]/80 hover:border-[#d4bbff]/25 cursor-pointer hover:shadow-lg hover:shadow-[#d4bbff]/[0.03]' : ''
      } ${glow ? 'hover:border-[#7dffa2]/30 hover:shadow-[0_0_30px_rgba(125,255,162,0.06)]' : ''} ${className}`}
      onClick={onClick}
      whileHover={hover ? { y: -4, transition: { type: 'spring', stiffness: 400, damping: 25 } } : undefined}
      whileTap={hover ? { scale: 0.98 } : undefined}
    >
      {children}
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
  <Card className={className}>
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
      {icon && <div className="text-[#d4bbff]/30">{icon}</div>}
    </div>
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
