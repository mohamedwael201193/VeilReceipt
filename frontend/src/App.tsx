// App — Root component with terminal layout shell

import { FC } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import TransactionToast from '@/components/ui/TransactionToast';
import { WalletProviderWrapper } from '@/components/providers/WalletProvider';
import Header from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { GridBackground, HudDecorations } from '@/components/effects/CosmicBackground';
import Home from '@/pages/Home';
import Checkout from '@/pages/Checkout';
import Purchases from '@/pages/Purchases';
import Receipts from '@/pages/Receipts';
import Merchant from '@/pages/Merchant';
import Verify from '@/pages/Verify';
import Pay from '@/pages/Pay';
import Integrate from '@/pages/Integrate';

const AppLayout: FC = () => {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div className="relative min-h-screen bg-[#050505] text-[#e5e2e1] overflow-x-hidden">
      {/* Background layers (non-landing pages only) */}
      {!isLanding && <GridBackground />}
      {!isLanding && <HudDecorations />}

      {/* Navigation — hidden on landing page */}
      {!isLanding && <Header />}
      {!isLanding && <Sidebar />}
      {!isLanding && <BottomNav />}

      {/* Main content — full-width on landing, offset on other pages */}
      <main className={isLanding ? 'relative z-10' : 'relative z-10 lg:pl-64 pt-20 pb-20 lg:pb-0'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/receipts" element={<Receipts />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/merchant" element={<Merchant />} />
          <Route path="/integrate" element={<Integrate />} />
          <Route path="/pay" element={<Pay />} />
          <Route path="/pay/:sessionId" element={<Pay />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0a0a0a',
            color: '#e5e2e1',
            borderRadius: '0px',
            border: '1px solid rgba(212,187,255,0.1)',
            fontSize: '13px',
            fontFamily: 'JetBrains Mono, monospace',
          },
          success: { iconTheme: { primary: '#7dffa2', secondary: '#050505' } },
          error: { iconTheme: { primary: '#f87171', secondary: '#050505' } },
        }}
      />
      <TransactionToast />
    </div>
  );
};

const App: FC = () => (
  <WalletProviderWrapper>
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  </WalletProviderWrapper>
);

export default App;
