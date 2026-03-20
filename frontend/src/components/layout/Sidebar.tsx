// Sidebar — Desktop-only fixed left navigation (Terminal aesthetic)

import { FC } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useVeilWallet } from '@/hooks/useVeilWallet';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/checkout', label: 'Shop', icon: 'shopping_cart' },
  { path: '/receipts', label: 'Receipts', icon: 'receipt_long' },
  { path: '/purchases', label: 'Purchases', icon: 'history' },
  { path: '/merchant', label: 'Merchant', icon: 'storefront' },
  { path: '/verify', label: 'Verify', icon: 'verified_user' },
  { path: '/integrate', label: 'API Docs', icon: 'bolt' },
];

export const Sidebar: FC = () => {
  const location = useLocation();
  const { disconnect, connected } = useVeilWallet();

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 border-r border-[#d4bbff]/10 bg-[#050505] z-40 pt-24">
      {/* Protocol branding */}
      <div className="px-6 mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-surface-container-highest border border-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-xs text-secondary">shield_lock</span>
          </div>
          <div>
            <h2 className="text-[#d4bbff] font-black italic tracking-widest text-sm font-headline">VEIL_PROTOCOL</h2>
            <p className="text-[10px] font-mono text-secondary">STATUS: // LIVE_ENCRYPTION</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-6 py-3 transition-all group ${
                active
                  ? 'bg-[#d4bbff]/10 text-[#d4bbff] border-l-4 border-[#d4bbff]'
                  : 'text-[#c9c6c5] opacity-60 hover:bg-[#1c1b1b] hover:opacity-100 border-l-4 border-transparent'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span className="font-mono text-xs tracking-wider">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer actions */}
      <div className="p-6 border-t border-[#d4bbff]/5">
        <Link
          to="/checkout"
          className="block w-full py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary font-mono text-xs font-bold tracking-widest text-center hover:brightness-110 active:scale-95 transition-all"
        >
          INITIATE_TX
        </Link>
        <div className="mt-6 flex flex-col gap-2">
          {connected && (
            <button
              onClick={disconnect}
              className="flex items-center gap-3 text-[10px] font-mono text-tertiary opacity-50 hover:opacity-100 transition-opacity"
            >
              <span className="material-symbols-outlined text-sm">logout</span> DISCONNECT
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
