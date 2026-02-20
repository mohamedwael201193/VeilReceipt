// Header — Floating glass navigation bar

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
  const { address, connected, disconnect } = useVeilWallet();
  const itemCount = useCartStore((s) => s.getItemCount());
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Glass bar */}
      <div className="mx-4 mt-4 rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.06] shadow-lg shadow-black/20">
        <div className="max-w-7xl mx-auto px-5">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <VeilIcon size={30} className="transition-transform group-hover:scale-110 duration-300" />
              <span className="text-lg font-bold text-white tracking-tight">
                VeilReceipt
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-0.5">
              {navLinks.map(({ path, label, icon: Icon }) => {
                const active = location.pathname === path;
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`relative px-4 py-2 rounded-xl flex items-center gap-2 text-sm transition-all duration-200 ${
                      active ? 'text-white' : 'text-white/40 hover:text-white/80'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                    {active && (
                      <motion.div
                        layoutId="navPill"
                        className="absolute inset-0 bg-white/[0.07] rounded-xl -z-10"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    {path === '/checkout' && itemCount > 0 && (
                      <span className="absolute -top-1 -right-0.5 bg-sky-500 text-white text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold leading-none">
                        {itemCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {connected && address && (
                <span className="hidden lg:block text-xs text-white/30 font-mono">
                  {truncateAddress(address)}
                </span>
              )}

              <WalletMultiButton />

              {connected && (
                <button
                  onClick={disconnect}
                  className="hidden sm:flex p-2 text-white/30 hover:text-white/70 transition-colors rounded-lg hover:bg-white/[0.05]"
                  title="Disconnect"
                >
                  <LogOutIcon size={16} />
                </button>
              )}

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 text-white/40 hover:text-white"
              >
                {mobileOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="md:hidden mx-4 mt-2 rounded-2xl bg-[#0a0a1a]/95 backdrop-blur-2xl border border-white/[0.06] overflow-hidden"
          >
            <nav className="p-3 space-y-1">
              {navLinks.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                    location.pathname === path
                      ? 'bg-white/[0.06] text-white'
                      : 'text-white/40 hover:bg-white/[0.04] hover:text-white/80'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              ))}
              {connected && (
                <button
                  onClick={() => { disconnect(); setMobileOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/40 hover:bg-white/[0.04] hover:text-white/80"
                >
                  <LogOutIcon size={18} />
                  Disconnect
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
