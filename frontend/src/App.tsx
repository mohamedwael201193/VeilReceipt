// Main App component with routing

import { FC } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { WalletProviderWrapper } from '@/components/providers/WalletProvider';
import Header from '@/components/layout/Header';
import Home from '@/pages/Home';
import Checkout from '@/pages/Checkout';
import Receipts from '@/pages/Receipts';
import Merchant from '@/pages/Merchant';

const App: FC = () => {
  return (
    <WalletProviderWrapper>
      <BrowserRouter>
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
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
                background: '#1e293b',
                color: '#f1f5f9',
                borderRadius: '12px',
                border: '1px solid rgba(123, 97, 255, 0.3)',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#f1f5f9',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#f1f5f9',
                },
              },
            }}
          />
        </div>
      </BrowserRouter>
    </WalletProviderWrapper>
  );
};

export default App;
