// BottomNav — Mobile-only bottom navigation bar (Terminal aesthetic)

import { FC } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/checkout', label: 'Shop', icon: 'shopping_cart' },
  { path: '/receipts', label: 'Receipts', icon: 'receipt_long' },
  { path: '/merchant', label: 'Merchant', icon: 'storefront' },
  { path: '/verify', label: 'Verify', icon: 'verified_user' },
];

export const BottomNav: FC = () => {
  const location = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 bg-black/80 backdrop-blur-2xl border-t border-[#d4bbff]/20">
      {navItems.map((item) => {
        const active = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center transition-all ${
              active
                ? 'text-[#7dffa2] scale-110'
                : 'text-[#c9c6c5] opacity-50'
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="text-[10px] font-mono uppercase tracking-widest mt-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
