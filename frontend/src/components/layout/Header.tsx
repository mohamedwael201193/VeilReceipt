// Navigation header component

import { FC, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useVeilWallet } from '@/hooks/useVeilWallet';
import { useCartStore } from '@/stores/cartStore';
import { truncateAddress } from '@/lib/utils';
import {
  VeilIcon,
  CartIcon,
  StoreIcon,
  ReceiptIcon,
  MenuIcon,
  CloseIcon,
  HomeIcon,
  LogOutIcon,
} from '@/components/icons/Icons';

const navLinks = [
  { path: '/', label: 'Home', icon: HomeIcon },
  { path: '/checkout', label: 'Shop', icon: CartIcon },
  { path: '/merchant', label: 'Merchant', icon: StoreIcon },
  { path: '/receipts', label: 'Receipts', icon: ReceiptIcon },
];

export const Header: FC = () => {
  const location = useLocation();
  const { address, connected, role, disconnect } = useVeilWallet();
  const itemCount = useCartStore((state) => state.getItemCount());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <VeilIcon size={36} className="transition-transform group-hover:scale-110" />
            <span className="text-xl font-bold bg-gradient-to-r from-veil-400 to-receipt-400 bg-clip-text text-transparent">
              VeilReceipt
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`relative px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="navIndicator"
                      className="absolute inset-0 bg-slate-800 rounded-lg -z-10"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  {path === '/checkout' && itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-receipt-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {itemCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Wallet & User */}
          <div className="flex items-center gap-4">
            {connected && address && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  {role === 'merchant' ? '🏪' : '👤'}
                </span>
                <span className="text-sm text-slate-300">
                  {truncateAddress(address)}
                </span>
              </div>
            )}
            
            <WalletMultiButton />
            
            {connected && (
              <button
                onClick={disconnect}
                className="hidden sm:flex p-2 text-slate-400 hover:text-white transition-colors"
                title="Disconnect"
              >
                <LogOutIcon size={18} />
              </button>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-slate-800 bg-slate-900"
          >
            <nav className="px-4 py-4 space-y-2">
              {navLinks.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    location.pathname === path
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </Link>
              ))}
              
              {connected && (
                <button
                  onClick={() => {
                    disconnect();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-white transition-colors"
                >
                  <LogOutIcon size={20} />
                  <span>Disconnect</span>
                </button>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;