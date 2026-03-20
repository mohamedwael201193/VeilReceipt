// Header — Terminal top bar navigation

import { FC } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useVeilWallet } from '@/hooks/useVeilWallet';
import { useCartStore } from '@/stores/cartStore';
import { truncateAddress } from '@/lib/utils';
import { VeilLogoMini } from '@/components/icons/VeilLogo';

const navLinks = [
  { path: '/', label: 'HOME' },
  { path: '/checkout', label: 'SHOP' },
  { path: '/receipts', label: 'RECEIPTS' },
  { path: '/purchases', label: 'PURCHASES' },
  { path: '/merchant', label: 'MERCHANT' },
  { path: '/verify', label: 'VERIFY' },
  { path: '/integrate', label: 'API' },
];

export const Header: FC = () => {
  const location = useLocation();
  const { address, connected, disconnect } = useVeilWallet();
  const itemCount = useCartStore((s) => s.getItemCount());

  return (
    <header className="fixed top-0 left-0 right-0 z-50 lg:pl-64">
      <div className="h-16 bg-[#050505]/80 backdrop-blur-xl border-b border-[#d4bbff]/10 flex items-center justify-between px-6">
        {/* Left — brand (visible on mobile where sidebar is hidden) */}
        <div className="flex items-center gap-3 lg:hidden">
          <VeilLogoMini size={24} />
          <span className="text-[#d4bbff] font-black italic tracking-widest text-xs font-headline">VEIL_RECEIPT</span>
        </div>

        {/* Center — desktop nav links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map(({ path, label }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`relative px-4 py-2 font-mono text-[11px] tracking-widest uppercase transition-all ${
                  active
                    ? 'text-[#d4bbff] bg-[#d4bbff]/10 border-b-2 border-[#d4bbff]'
                    : 'text-[#c9c6c5]/60 hover:text-[#e5e2e1] hover:bg-[#1c1b1b]'
                }`}
              >
                {label}
                {path === '/checkout' && itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#7dffa2] text-[#050505] text-[9px] w-4 h-4 flex items-center justify-center font-bold font-mono">
                    {itemCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Left spacer on desktop */}
        <div className="hidden lg:block" />

        {/* Right — wallet + address */}
        <div className="flex items-center gap-3">
          {connected && address && (
            <span className="hidden md:flex items-center gap-2 text-[10px] font-mono text-[#7dffa2]/60 tracking-wider">
              <span className="w-1.5 h-1.5 bg-[#7dffa2] animate-pulse" />
              {truncateAddress(address)}
            </span>
          )}

          <WalletMultiButton />

          {connected && (
            <button
              onClick={disconnect}
              className="hidden sm:flex items-center justify-center w-8 h-8 text-[#c9c6c5]/40 hover:text-[#d4bbff] hover:bg-[#d4bbff]/10 transition-all"
              title="Disconnect"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
