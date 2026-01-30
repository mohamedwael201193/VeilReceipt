// Custom animated icons for VeilReceipt
// Uses Lucide icons with custom styling

import { motion } from 'framer-motion';
import {
  Shield,
  Receipt,
  ShoppingCart,
  Store,
  ArrowLeftRight,
  Star,
  Lock,
  Unlock,
  Check,
  X,
  Loader2,
  Wallet,
  Copy,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Plus,
  Minus,
  Trash2,
  Eye,
  EyeOff,
  Info,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Package,
  Tag,
  DollarSign,
  Zap,
  Award,
  TrendingUp,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Home,
  FileText,
  CreditCard,
} from 'lucide-react';
import { FC } from 'react';

interface IconProps {
  className?: string;
  size?: number;
  animate?: boolean;
}

// Animated wrapper
const AnimatedIcon: FC<{ children: React.ReactNode; animate?: boolean; className?: string }> = ({ 
  children, 
  animate = false,
  className = ''
}) => {
  if (!animate) return <span className={className}>{children}</span>;
  
  return (
    <motion.span
      className={className}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.span>
  );
};

// VeilReceipt Brand Icon
export const VeilIcon: FC<IconProps> = ({ className = '', size = 24, animate }) => (
  <AnimatedIcon animate={animate} className={className}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="veilGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#d946ef" />
        </linearGradient>
      </defs>
      <path
        d="M50 5 L90 20 L90 50 C90 75 70 90 50 95 C30 90 10 75 10 50 L10 20 Z"
        fill="url(#veilGrad)"
        opacity="0.9"
      />
      <path
        d="M50 15 L80 27 L80 50 C80 70 65 82 50 86 C35 82 20 70 20 50 L20 27 Z"
        fill="#0c4a6e"
        opacity="0.8"
      />
      <rect x="35" y="30" width="30" height="40" rx="2" fill="white" opacity="0.9" />
      <rect x="40" y="36" width="20" height="2" fill="#0ea5e9" />
      <rect x="40" y="42" width="15" height="2" fill="#64748b" />
      <rect x="40" y="48" width="18" height="2" fill="#64748b" />
      <rect x="40" y="54" width="12" height="2" fill="#64748b" />
      <rect x="40" y="60" width="16" height="2" fill="#d946ef" />
    </svg>
  </AnimatedIcon>
);

// Loading spinner with gradient
export const LoadingSpinner: FC<IconProps> = ({ className = '', size = 24 }) => (
  <motion.div
    className={className}
    animate={{ rotate: 360 }}
    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
  >
    <Loader2 size={size} className="text-veil-400" />
  </motion.div>
);

// Success checkmark with animation
export const SuccessCheck: FC<IconProps> = ({ className = '', size = 24 }) => (
  <motion.div
    className={`text-green-400 ${className}`}
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
  >
    <CheckCircle2 size={size} />
  </motion.div>
);

// Error X with animation
export const ErrorX: FC<IconProps> = ({ className = '', size = 24 }) => (
  <motion.div
    className={`text-red-400 ${className}`}
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
  >
    <XCircle size={size} />
  </motion.div>
);

// Pulse indicator for pending states
export const PulseIndicator: FC<{ color?: string }> = ({ color = 'bg-yellow-400' }) => (
  <span className="relative flex h-3 w-3">
    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} />
    <span className={`relative inline-flex rounded-full h-3 w-3 ${color}`} />
  </span>
);

// Export all Lucide icons with consistent naming
export {
  Shield as ShieldIcon,
  Receipt as ReceiptIcon,
  ShoppingCart as CartIcon,
  Store as StoreIcon,
  ArrowLeftRight as ReturnIcon,
  Star as LoyaltyIcon,
  Lock as PrivateIcon,
  Unlock as PublicIcon,
  Check as CheckIcon,
  X as CloseIcon,
  Wallet as WalletIcon,
  Copy as CopyIcon,
  ExternalLink as ExternalLinkIcon,
  ChevronRight as ChevronRightIcon,
  ChevronDown as ChevronDownIcon,
  Plus as PlusIcon,
  Minus as MinusIcon,
  Trash2 as TrashIcon,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  Info as InfoIcon,
  AlertCircle as AlertIcon,
  Clock as ClockIcon,
  RefreshCw as RefreshIcon,
  Package as PackageIcon,
  Tag as TagIcon,
  DollarSign as DollarIcon,
  Zap as ZapIcon,
  Award as AwardIcon,
  TrendingUp as TrendingIcon,
  BarChart3 as ChartIcon,
  Settings as SettingsIcon,
  LogOut as LogOutIcon,
  Menu as MenuIcon,
  Home as HomeIcon,
  FileText as FileIcon,
  CreditCard as CardIcon,
};
