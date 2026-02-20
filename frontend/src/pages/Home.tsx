// Home — Cosmic hero landing page with 3D animations

import { FC } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useVeilWallet } from '@/hooks/useVeilWallet';
import { Button, Card } from '@/components/ui/Components';
import {
  CosmicVortex,
  FloatingParticles,
  GridBackground,
  AuroraGlow,
  ParticleField,
  GlowOrb,
  ShieldAnimation,
} from '@/components/effects/CosmicBackground';
import {
  ShieldIcon,
  ReceiptIcon,
  CartIcon,
  LoyaltyIcon,
  ZapIcon,
  DollarIcon,
} from '@/components/icons/Icons';

const features = [
  {
    icon: <ShieldIcon size={24} className="text-sky-400" />,
    title: 'Private Payments',
    desc: 'Atomic private transfers using Aleo credits or USDCx stablecoins. Purchase details stay encrypted on-chain.',
    gradient: 'from-sky-500/20 to-sky-500/5',
  },
  {
    icon: <ReceiptIcon size={24} className="text-purple-400" />,
    title: 'Dual Receipts',
    desc: 'Buyer and merchant both receive encrypted receipts in one atomic transaction. Zero data leaks.',
    gradient: 'from-purple-500/20 to-purple-500/5',
  },
  {
    icon: <DollarIcon size={24} className="text-emerald-400" />,
    title: 'USDCx Stablecoin',
    desc: 'Pay with USDCx for price stability. MerkleProof compliance verification built into every transfer.',
    gradient: 'from-emerald-500/20 to-emerald-500/5',
  },
  {
    icon: <ZapIcon size={24} className="text-amber-400" />,
    title: 'Escrow & Refunds',
    desc: 'Lock funds on-chain with a 500-block return window. Self-refund or release to merchant with no intermediary.',
    gradient: 'from-amber-500/20 to-amber-500/5',
  },
  {
    icon: <LoyaltyIcon size={24} className="text-fuchsia-400" />,
    title: 'ZK Loyalty Proofs',
    desc: 'Accumulate loyalty stamps from purchases. Prove tier status without revealing your actual count or history.',
    gradient: 'from-fuchsia-500/20 to-fuchsia-500/5',
  },
  {
    icon: <CartIcon size={24} className="text-indigo-400" />,
    title: 'Purchase Support',
    desc: 'Generate non-consuming proof tokens for customer support without revealing full receipt details.',
    gradient: 'from-indigo-500/20 to-indigo-500/5',
  },
];

const steps = [
  { num: '01', title: 'Connect Wallet', desc: 'Link your Leo or Shield wallet with auto-decrypt permissions for seamless transactions.' },
  { num: '02', title: 'Choose Payment Mode', desc: 'Select private credits, USDCx stablecoin, public transfer, or escrow with refund protection.' },
  { num: '03', title: 'Checkout Atomically', desc: 'One transaction: payment transfer + encrypted buyer receipt + encrypted merchant receipt.' },
  { num: '04', title: 'Manage & Prove', desc: 'View private receipts, claim loyalty stamps, prove tier status, or request escrow refunds.' },
];

const Home: FC = () => {
  const { connected } = useVeilWallet();

  return (
    <div className="relative min-h-screen">
      {/* === HERO SECTION === */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background layers */}
        <GridBackground />
        <AuroraGlow />
        <CosmicVortex />
        <FloatingParticles count={50} />
        <GlowOrb color="#38bdf8" size={400} position={{ top: '10%', left: '15%' }} />
        <GlowOrb color="#a855f7" size={300} position={{ bottom: '20%', right: '10%' }} />

        {/* Hero content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center pt-24 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Status pill */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-sm text-white/60">
                Live on Aleo Testnet
              </span>
            </motion.div>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-5xl sm:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight"
          >
            <span className="text-white">Privacy at the</span>
            <br />
            <span className="bg-gradient-to-r from-sky-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              Speed of Commerce
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.7 }}
            className="mt-8 text-lg sm:text-xl text-white/40 max-w-2xl mx-auto leading-relaxed"
          >
            Atomic private payments, on-chain escrow with refunds, USDCx stablecoins,
            and zero-knowledge loyalty proofs — all in one protocol.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-12 flex flex-wrap justify-center gap-4"
          >
            <Link to="/checkout">
              <Button variant="primary" size="lg" icon={<CartIcon size={18} />}>
                Start Shopping
              </Button>
            </Link>
            {!connected && (
              <Link to="/merchant">
                <Button variant="secondary" size="lg">
                  Become a Merchant
                </Button>
              </Link>
            )}
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1 }}
            className="mt-16 flex flex-wrap justify-center gap-8 text-sm text-white/20"
          >
            {['Zero-Knowledge Proofs', 'Aleo L1 Blockchain', 'Open Source Protocol'].map((t) => (
              <span key={t} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-sky-500/50" />
                {t}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030014] to-transparent" />
      </section>

      {/* === FEATURES SECTION === */}
      <section className="relative py-32 overflow-hidden">
        <ParticleField />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
              Built for Real Privacy
            </h2>
            <p className="mt-4 text-white/30 max-w-lg mx-auto">
              Every feature designed to protect your financial data while enabling real commerce.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
              >
                <Card hover glow className="h-full">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-b ${feat.gradient} mb-4`}>
                    {feat.icon}
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{feat.title}</h3>
                  <p className="text-sm text-white/35 leading-relaxed">{feat.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* === HOW IT WORKS === */}
      <section className="relative py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            {/* Left: Animated shield */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-shrink-0"
            >
              <ShieldAnimation size={200} />
            </motion.div>

            {/* Right: Steps */}
            <div className="flex-1">
              <motion.h2
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-10"
              >
                How it Works
              </motion.h2>

              <div className="space-y-8">
                {steps.map((step, i) => (
                  <motion.div
                    key={step.num}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.12 }}
                    className="flex gap-5 items-start group"
                  >
                    <span className="text-2xl font-bold text-white/10 group-hover:text-sky-500/30 transition-colors duration-300 tabular-nums">
                      {step.num}
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-white mb-1">{step.title}</h3>
                      <p className="text-sm text-white/35 leading-relaxed">{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === CTA SECTION === */}
      <section className="relative py-32 overflow-hidden">
        <GlowOrb color="#38bdf8" size={500} position={{ top: '-20%', left: '30%' }} />
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
              Ready to transact privately?
            </h2>
            <p className="mt-5 text-white/30 max-w-lg mx-auto">
              Connect your wallet and experience the future of private commerce on Aleo.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link to="/checkout">
                <Button variant="glow" size="lg" icon={<ShieldIcon size={18} />}>
                  Get Started
                </Button>
              </Link>
              <Link to="/merchant">
                <Button variant="secondary" size="lg" icon={<CartIcon size={18} />}>
                  Merchant Portal
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="border-t border-white/[0.04] py-8">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <p className="text-xs text-white/20">VeilReceipt v3 &middot; Privacy-First Commerce on Aleo</p>
          <p className="text-xs text-white/10">Testnet</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
