// App — Root component with cosmic dark theme

import { FC } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { WalletProviderWrapper } from '@/components/providers/WalletProvider';
import Header from '@/components/layout/Header';
import Home from '@/pages/Home';
import Checkout from '@/pages/Checkout';
import Receipts from '@/pages/Receipts';
import Merchant from '@/pages/Merchant';

const App: FC = () => (
  <WalletProviderWrapper>
    <BrowserRouter>
      <div className="relative min-h-screen bg-[#030014] overflow-x-hidden">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/receipts" element={<Receipts />} />
          <Route path="/merchant" element={<Merchant />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0a0a1a',
              color: '#ffffff',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#34d399', secondary: '#fff' } },
            error: { iconTheme: { primary: '#f87171', secondary: '#fff' } },
          }}
        />
      </div>
    </BrowserRouter>
  </WalletProviderWrapper>
);

export default App;
