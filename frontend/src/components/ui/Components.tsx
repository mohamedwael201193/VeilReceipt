// Redesigned UI Components — Dark cosmic glassmorphism system

import { FC, ReactNode, ButtonHTMLAttributes } from 'react';
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
  const base = 'relative inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden';

  const variants: Record<string, string> = {
    primary: 'bg-white text-black hover:bg-white/90 shadow-lg shadow-white/10',
    secondary: 'bg-white/[0.06] text-white border border-white/[0.1] hover:bg-white/[0.1] hover:border-white/[0.2] backdrop-blur-sm',
    ghost: 'text-white/60 hover:text-white hover:bg-white/[0.06]',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20',
    glow: 'bg-gradient-to-r from-sky-500 to-purple-500 text-white shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.02]',
  };

  const sizes: Record<string, string> = {
    sm: 'px-3.5 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoadingSpinner size={16} /> : icon}
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
      className={`relative group bg-white/[0.03] backdrop-blur-xl border border-white/[0.07] rounded-2xl p-6 transition-all duration-300 ${
        hover ? 'hover:bg-white/[0.06] hover:border-white/[0.12] cursor-pointer' : ''
      } ${glow ? 'hover:shadow-lg hover:shadow-sky-500/5' : ''} ${className}`}
      onClick={onClick}
      whileHover={hover ? { y: -2 } : undefined}
      whileTap={hover ? { scale: 0.98 } : undefined}
    >
      {glow && (
        <div className="absolute -inset-px bg-gradient-to-r from-sky-500/10 via-purple-500/10 to-fuchsia-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-sm" />
      )}
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
    default: 'bg-white/[0.06] text-white/60 border-white/[0.08]',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  const dotColors: Record<string, string> = {
    default: 'bg-white/40',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    error: 'bg-red-400',
    info: 'bg-sky-400',
    purple: 'bg-purple-400',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}>
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
    {label && <label className="block text-sm font-medium text-white/50">{label}</label>}
    <div className="relative">
      {icon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">{icon}</span>}
      <input
        className={`w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white placeholder-white/25 focus:border-sky-500/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-sky-500/30 transition-all duration-200 ${
          icon ? 'pl-10' : ''
        } ${error ? 'border-red-500/50' : ''} ${className}`}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-red-400">{error}</p>}
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
    {label && <label className="block text-sm font-medium text-white/50">{label}</label>}
    <select
      className={`w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-all duration-200 ${
        error ? 'border-red-500/50' : ''
      } ${className}`}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-[#0a0a1a] text-white">
          {opt.label}
        </option>
      ))}
    </select>
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

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
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative bg-[#0a0a1a]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 w-full max-w-lg shadow-2xl shadow-sky-500/5"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors text-xl leading-none">&times;</button>
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
    <div className="text-white/20 mb-5">{icon}</div>
    <h3 className="text-lg font-semibold text-white/80 mb-2">{title}</h3>
    {description && <p className="text-white/40 mb-6 max-w-md text-sm">{description}</p>}
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
        <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
        <div className="text-2xl font-bold text-white mt-1.5">{value}</div>
        {trend && (
          <p className={`text-xs mt-2 font-medium ${trend.positive ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend.positive ? '+' : ''}{trend.value}%
          </p>
        )}
      </div>
      {icon && <div className="text-white/20">{icon}</div>}
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
    <div className="inline-flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
            active === tab.id
              ? 'text-white'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          {active === tab.id && (
            <motion.div
              layoutId="pillNav"
              className="absolute inset-0 bg-white/[0.08] border border-white/[0.1] rounded-lg"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          <span className="relative flex items-center gap-2">
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="bg-white/[0.1] text-white/60 text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
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
      <h1 className="text-3xl font-bold text-white tracking-tight">{title}</h1>
      {subtitle && <p className="text-white/40 mt-1.5 text-sm">{subtitle}</p>}
    </div>
    {action}
  </div>
);
