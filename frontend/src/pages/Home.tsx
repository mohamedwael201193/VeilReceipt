// Home page - Landing and overview

import { FC } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useVeilWallet } from '@/hooks/useVeilWallet';
import {
  VeilIcon,
  ReceiptIcon,
  ReturnIcon,
  LoyaltyIcon,
  PrivateIcon,
  CartIcon,
  StoreIcon,
  ZapIcon,
} from '@/components/icons/Icons';
import { Button, Card } from '@/components/ui/Components';

const features = [
  {
    icon: <PrivateIcon size={32} />,
    title: 'Private Checkout',
    description: 'Your purchases are encrypted on-chain. Only you can view your receipt details.',
    color: 'from-veil-500 to-veil-600',
  },
  {
    icon: <ReceiptIcon size={32} />,
    title: 'Verifiable Receipts',
    description: 'Get cryptographic proof of purchase without revealing what you bought.',
    color: 'from-receipt-500 to-receipt-600',
  },
  {
    icon: <ReturnIcon size={32} />,
    title: 'Private Returns',
    description: 'Process returns using nullifiers. No one can link your return to your identity.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: <LoyaltyIcon size={32} />,
    title: 'Anonymous Loyalty',
    description: 'Earn loyalty rewards without exposing your full purchase history.',
    color: 'from-amber-500 to-amber-600',
  },
];

const HomePage: FC = () => {
  const { connected } = useVeilWallet();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-veil-900/20 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-radial from-veil-500/10 via-transparent to-transparent" />
        
        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex justify-center mb-8">
              <VeilIcon size={80} animate />
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-veil-400 via-white to-receipt-400 bg-clip-text text-transparent">
                Privacy-First Commerce
              </span>
            </h1>
            
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Shop, get receipts, process returns, and earn loyalty rewards — all while keeping your 
              purchase history completely private on Aleo.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!connected ? (
                <WalletMultiButton />
              ) : (
                <>
                  <Link to="/checkout">
                    <Button variant="primary" size="lg" icon={<CartIcon size={20} />}>
                      Start Shopping
                    </Button>
                  </Link>
                  <Link to="/merchant">
                    <Button variant="secondary" size="lg" icon={<StoreIcon size={20} />}>
                      Merchant Console
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Complete Privacy Suite
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Every aspect of your commerce experience is protected by zero-knowledge proofs
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card hover className="h-full">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.color} mb-4`}>
                    <span className="text-white">{feature.icon}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              How It Works
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Connect Wallet', desc: 'Use Leo Wallet to connect your Aleo address' },
              { step: '2', title: 'Shop Privately', desc: 'Browse products and checkout with encrypted receipts' },
              { step: '3', title: 'Own Your Data', desc: 'Receipts are records you own — process returns & claim rewards' },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-veil-500 to-receipt-500 flex items-center justify-center text-xl font-bold text-white mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Card className="bg-gradient-to-r from-veil-900/50 to-receipt-900/50 border-veil-700">
              <ZapIcon size={48} className="text-veil-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-4">
                Ready to experience private commerce?
              </h2>
              <p className="text-slate-300 mb-6">
                Built on Aleo's zero-knowledge blockchain for true transaction privacy.
              </p>
              {!connected ? (
                <WalletMultiButton />
              ) : (
                <Link to="/checkout">
                  <Button variant="primary" size="lg">
                    Go to Shop
                  </Button>
                </Link>
              )}
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <VeilIcon size={24} />
            <span className="text-slate-400">VeilReceipt — Privacy-first commerce on Aleo</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-sm">
            <span>Built with 🛡️ for the Aleo ecosystem</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
