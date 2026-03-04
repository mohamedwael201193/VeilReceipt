// Home — Clean dark landing page with hero + feature SVGs

import { FC, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useVeilWallet } from '@/hooks/useVeilWallet';
import { Button } from '@/components/ui/Components';
import {
  ShieldIcon,
  CartIcon,
} from '@/components/icons/Icons';

/* ── Inline SVG illustrations ─────────────────────────────── */

const PrivatePaymentsSVG: FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Credit card */}
    <rect x="60" y="80" width="200" height="130" rx="16" stroke="white" strokeWidth="2" opacity="0.9"/>
    <rect x="60" y="110" width="200" height="28" fill="white" opacity="0.08"/>
    <rect x="80" y="155" width="60" height="8" rx="4" fill="white" opacity="0.15"/>
    <rect x="80" y="172" width="40" height="8" rx="4" fill="white" opacity="0.1"/>
    <circle cx="230" cy="175" r="14" stroke="#22c55e" strokeWidth="2" opacity="0.8"/>
    <circle cx="244" cy="175" r="14" stroke="#22c55e" strokeWidth="2" opacity="0.5"/>
    {/* Lock overlay */}
    <rect x="240" y="100" width="100" height="80" rx="12" stroke="white" strokeWidth="2" opacity="0.7"/>
    <path d="M275 120 v-12 a15 15 0 0 1 30 0 v12" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.8"/>
    <circle cx="290" cy="143" r="6" fill="#22c55e"/>
    <line x1="290" y1="149" x2="290" y2="158" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"/>
    {/* Signal waves */}
    <path d="M330 110 q12-20 0-40" stroke="#22c55e" strokeWidth="1.5" opacity="0.3" strokeLinecap="round"/>
    <path d="M340 115 q16-25 0-50" stroke="#22c55e" strokeWidth="1.5" opacity="0.2" strokeLinecap="round"/>
    {/* Coins */}
    <ellipse cx="100" cy="260" rx="28" ry="10" stroke="white" strokeWidth="1.5" opacity="0.2"/>
    <ellipse cx="100" cy="252" rx="28" ry="10" stroke="white" strokeWidth="1.5" opacity="0.3"/>
    <ellipse cx="100" cy="244" rx="28" ry="10" fill="#22c55e" stroke="#22c55e" strokeWidth="1.5" opacity="0.35"/>
    <text x="92" y="249" fill="#22c55e" fontSize="10" fontWeight="700" opacity="0.7">AC</text>
  </svg>
);

const DualReceiptsSVG: FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Receipt 1 (buyer - left) */}
    <g transform="translate(50, 40) rotate(-4)">
      <path d="M0 0 h120 v175 l-8-6-8 6-8-6-8 6-8-6-8 6-8-6-8 6-8-6-8 6-8-6-8 6-8-6-8 6 v-175z" stroke="white" strokeWidth="1.5" opacity="0.7" fill="white" fillOpacity="0.03"/>
      <rect x="16" y="20" width="88" height="6" rx="3" fill="white" opacity="0.2"/>
      <rect x="16" y="36" width="60" height="4" rx="2" fill="white" opacity="0.1"/>
      <rect x="16" y="52" width="88" height="1" fill="white" opacity="0.06"/>
      <rect x="16" y="64" width="50" height="4" rx="2" fill="white" opacity="0.1"/>
      <rect x="78" y="64" width="26" height="4" rx="2" fill="white" opacity="0.1"/>
      <rect x="16" y="78" width="50" height="4" rx="2" fill="white" opacity="0.1"/>
      <rect x="78" y="78" width="26" height="4" rx="2" fill="white" opacity="0.1"/>
      <rect x="16" y="98" width="88" height="1" fill="white" opacity="0.06"/>
      <rect x="58" y="110" width="46" height="6" rx="3" fill="#22c55e" opacity="0.5"/>
      <circle cx="28" cy="136" r="8" stroke="#22c55e" strokeWidth="1.5" opacity="0.4"/>
      <path d="M24 136 l3 3 6-6" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </g>
    {/* Receipt 2 (merchant - right) */}
    <g transform="translate(220, 50) rotate(3)">
      <path d="M0 0 h120 v175 l-8-6-8 6-8-6-8 6-8-6-8 6-8-6-8 6-8-6-8 6-8-6-8 6-8-6-8 6 v-175z" stroke="white" strokeWidth="1.5" opacity="0.7" fill="white" fillOpacity="0.03"/>
      <rect x="16" y="20" width="88" height="6" rx="3" fill="white" opacity="0.2"/>
      <rect x="16" y="36" width="60" height="4" rx="2" fill="white" opacity="0.1"/>
      <rect x="16" y="52" width="88" height="1" fill="white" opacity="0.06"/>
      <rect x="16" y="64" width="50" height="4" rx="2" fill="white" opacity="0.1"/>
      <rect x="78" y="64" width="26" height="4" rx="2" fill="white" opacity="0.1"/>
      <rect x="16" y="78" width="50" height="4" rx="2" fill="white" opacity="0.1"/>
      <rect x="78" y="78" width="26" height="4" rx="2" fill="white" opacity="0.1"/>
      <rect x="16" y="98" width="88" height="1" fill="white" opacity="0.06"/>
      <rect x="58" y="110" width="46" height="6" rx="3" fill="#22c55e" opacity="0.5"/>
      <circle cx="28" cy="136" r="8" stroke="#22c55e" strokeWidth="1.5" opacity="0.4"/>
      <path d="M24 136 l3 3 6-6" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </g>
    {/* Arrow connecting them */}
    <g opacity="0.35">
      <path d="M178 145 h44" stroke="#22c55e" strokeWidth="2" strokeDasharray="4 3"/>
      <path d="M218 140 l6 5-6 5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
    {/* Shield badge center */}
    <g transform="translate(183, 90)">
      <path d="M17 0 L34 9 V22 C34 32 26 40 17 44 C8 40 0 32 0 22 V9 Z" stroke="#22c55e" strokeWidth="1.5" fill="#22c55e" fillOpacity="0.08"/>
      <path d="M11 21 l4 4 8-9" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
    {/* Labels */}
    <text x="95" y="280" fill="white" fontSize="11" opacity="0.25" textAnchor="middle" fontFamily="Inter">BUYER</text>
    <text x="290" y="280" fill="white" fontSize="11" opacity="0.25" textAnchor="middle" fontFamily="Inter">MERCHANT</text>
  </svg>
);

const EscrowSVG: FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Vault / Safe box */}
    <rect x="110" y="60" width="180" height="160" rx="16" stroke="white" strokeWidth="2" opacity="0.7"/>
    <rect x="118" y="68" width="164" height="144" rx="12" stroke="white" strokeWidth="1" opacity="0.1"/>
    {/* Dial */}
    <circle cx="200" cy="140" r="40" stroke="white" strokeWidth="2" opacity="0.5"/>
    <circle cx="200" cy="140" r="32" stroke="white" strokeWidth="1" opacity="0.15"/>
    <circle cx="200" cy="140" r="4" fill="#22c55e" opacity="0.8"/>
    {/* Dial ticks */}
    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
      <line
        key={angle}
        x1={200 + 34 * Math.cos((angle * Math.PI) / 180)}
        y1={140 + 34 * Math.sin((angle * Math.PI) / 180)}
        x2={200 + 38 * Math.cos((angle * Math.PI) / 180)}
        y2={140 + 38 * Math.sin((angle * Math.PI) / 180)}
        stroke="white"
        strokeWidth="1.5"
        opacity="0.3"
        strokeLinecap="round"
      />
    ))}
    {/* Dial hand */}
    <line x1="200" y1="140" x2="200" y2="108" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
    {/* Handle */}
    <rect x="260" y="125" width="20" height="30" rx="4" stroke="white" strokeWidth="1.5" opacity="0.4"/>
    {/* Timer icon bottom */}
    <g transform="translate(170, 245)">
      <circle cx="16" cy="16" r="14" stroke="#22c55e" strokeWidth="1.5" opacity="0.5"/>
      <line x1="16" y1="16" x2="16" y2="8" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <line x1="16" y1="16" x2="22" y2="16" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <line x1="16" y1="0" x2="16" y2="-4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
    </g>
    <text x="210" y="265" fill="white" fontSize="10" opacity="0.2" fontFamily="Inter">500 blocks</text>
    {/* Refund arrow */}
    <g transform="translate(60, 130)" opacity="0.3">
      <path d="M40 20 Q20 20 20 0 Q20 -20 40 -20" stroke="#22c55e" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M36 -25 l6 5-2 7" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
  </svg>
);

const SupportProofSVG: FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Shield outline */}
    <path d="M200 30 L310 75 V170 C310 230 260 275 200 300 C140 275 90 230 90 170 V75 Z" stroke="white" strokeWidth="2" opacity="0.6" fill="white" fillOpacity="0.02"/>
    <path d="M200 50 L296 88 V170 C296 222 252 260 200 282 C148 260 104 222 104 170 V88 Z" stroke="white" strokeWidth="1" opacity="0.08"/>
    {/* Fingerprint-style lines inside shield */}
    <path d="M180 130 Q180 110 200 110 Q220 110 220 130" stroke="white" strokeWidth="1.5" opacity="0.15" fill="none" strokeLinecap="round"/>
    <path d="M170 145 Q170 105 200 105 Q230 105 230 145" stroke="white" strokeWidth="1.5" opacity="0.12" fill="none" strokeLinecap="round"/>
    <path d="M160 155 Q160 100 200 100 Q240 100 240 155" stroke="white" strokeWidth="1.5" opacity="0.09" fill="none" strokeLinecap="round"/>
    {/* ZK badge center */}
    <circle cx="200" cy="165" r="28" stroke="#22c55e" strokeWidth="2" opacity="0.6" fill="#22c55e" fillOpacity="0.06"/>
    <text x="200" y="171" fill="#22c55e" fontSize="16" fontWeight="700" textAnchor="middle" opacity="0.8" fontFamily="Inter">ZK</text>
    {/* Proof token sparkle */}
    <g transform="translate(245, 120)" opacity="0.4">
      <line x1="10" y1="0" x2="10" y2="20" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="0" y1="10" x2="20" y2="10" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round"/>
    </g>
    <g transform="translate(135, 195)" opacity="0.25">
      <line x1="8" y1="0" x2="8" y2="16" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="0" y1="8" x2="16" y2="8" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round"/>
    </g>
    {/* Small checkmark at bottom */}
    <g transform="translate(180, 210)">
      <circle cx="20" cy="12" r="10" stroke="#22c55e" strokeWidth="1.5" opacity="0.35"/>
      <path d="M15 12 l4 4 8-8" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </g>
  </svg>
);

const featureIllustrations: ReactNode[] = [
  <PrivatePaymentsSVG className="w-full h-auto" />,
  <DualReceiptsSVG className="w-full h-auto" />,
  <EscrowSVG className="w-full h-auto" />,
  <SupportProofSVG className="w-full h-auto" />,
];

const features = [
  {
    title: 'Private Payments',
    desc: 'Atomic private transfers using Aleo credits or USDCx stablecoins. Purchase details stay encrypted on-chain.',
  },
  {
    title: 'Dual Receipts',
    desc: 'Buyer and merchant both receive encrypted receipts in one atomic transaction. Zero data leaks.',
  },
  {
    title: 'Escrow & Refunds',
    desc: 'Lock funds on-chain with a 500-block return window. Self-refund or release to merchant — no intermediary.',
  },
  {
    title: 'Purchase Support',
    desc: 'Generate non-consuming proof tokens for customer support without revealing full receipt details.',
  },
];

const steps = [
  { num: '01', title: 'Connect Wallet', desc: 'Link your Leo or Shield wallet with auto-decrypt permissions for seamless transactions.' },
  { num: '02', title: 'Choose Payment Mode', desc: 'Select private credits, USDCx stablecoin, public transfer, or escrow with refund protection.' },
  { num: '03', title: 'Checkout Atomically', desc: 'One transaction: payment + encrypted buyer receipt + encrypted merchant receipt.' },
  { num: '04', title: 'Manage & Prove', desc: 'View private receipts, track purchases, request escrow refunds, or prove purchase history.' },
];

const Home: FC = () => {
  const { connected } = useVeilWallet();

  return (
    <div className="relative min-h-screen">
      {/* === HERO SECTION === */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-28 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left — Text */}
            <div>
              {/* Status pill */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08]"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                </span>
                <span className="text-sm text-white/60">Live on Aleo Testnet</span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="font-display text-5xl sm:text-6xl lg:text-[4.25rem] font-normal leading-[1.05] tracking-tight"
              >
                <span className="text-white">Privacy at the</span>
                <br />
                <span className="italic text-white">Speed of Commerce</span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.7 }}
                className="mt-8 text-base sm:text-lg text-white/50 max-w-md leading-relaxed"
              >
                Atomic private payments, on-chain escrow with refunds, USDCx stablecoins,
                and zero-knowledge proofs — all in one protocol.
              </motion.p>

              {/* CTA buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="mt-10 flex flex-wrap gap-4"
              >
                <Link to="/checkout">
                  <Button variant="glow" size="lg" icon={<CartIcon size={18} />}>
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
                transition={{ delay: 1.1, duration: 1 }}
                className="mt-14 flex flex-wrap gap-6 text-sm text-white/25"
              >
                {['Zero-Knowledge Proofs', 'Aleo L1 Blockchain', 'Open Source Protocol'].map((t) => (
                  <span key={t} className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-green-500/50" />
                    {t}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Right — Hero video */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 1.2, ease: 'easeOut' }}
              className="relative flex items-center justify-center lg:-mr-12 xl:-mr-20"
            >
              {/* Glow rings behind */}
              <div className="absolute inset-0 -z-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] rounded-full border border-green-500/[0.06]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] rounded-full border border-green-500/[0.03]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-green-500/[0.04] blur-[80px] rounded-full" />
              </div>
              <video
                src="/hero.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full lg:w-[130%] xl:w-[140%] max-w-none rounded-2xl object-contain drop-shadow-[0_0_40px_rgba(34,197,94,0.08)]"
              />
            </motion.div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent" />
      </section>

      {/* === FEATURES SECTION === */}
      <section className="relative py-32 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-24"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-400/70 mb-4">Core Features</p>
            <h2 className="font-display text-4xl sm:text-5xl font-normal text-white tracking-tight">
              Built for Real Privacy
            </h2>
          </motion.div>

          <div className="space-y-32">
            {features.map((feat, i) => {
              const isEven = i % 2 === 0;
              return (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.7 }}
                  className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center ${!isEven ? 'lg:direction-rtl' : ''}`}
                >
                  {/* Illustration side */}
                  <div className={`${!isEven ? 'lg:order-2' : ''}`}>
                    <div className="relative group flex items-center justify-center p-8">
                      <div className="group-hover:scale-[1.03] transition-transform duration-700">
                        {featureIllustrations[i]}
                      </div>
                      <div className="absolute -inset-4 -z-10 rounded-3xl bg-green-500/[0.03] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    </div>
                  </div>

                  {/* Text side */}
                  <div className={`${!isEven ? 'lg:order-1' : ''}`}>
                    <span className="inline-block text-xs font-semibold uppercase tracking-[0.15em] text-green-400/60 mb-4">
                      0{i + 1}
                    </span>
                    <h3 className="font-display text-3xl sm:text-4xl font-normal text-white mb-5 tracking-tight">
                      {feat.title}
                    </h3>
                    <p className="text-base sm:text-lg text-white/40 leading-relaxed max-w-md">
                      {feat.desc}
                    </p>
                    <div className="mt-8 h-px w-16 bg-white/[0.08]" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* === HOW IT WORKS === */}
      <section className="relative py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-display text-3xl sm:text-4xl font-medium text-white tracking-tight mb-12 text-center"
          >
            How it Works
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-5 items-start p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl hover:border-white/[0.1] transition-all"
              >
                <span className="font-display text-3xl font-medium text-white/15 tabular-nums flex-shrink-0">
                  {step.num}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">{step.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* === CTA SECTION === */}
      <section className="relative py-32 overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-4xl sm:text-5xl font-medium text-white tracking-tight italic">
              Ready to transact privately?
            </h2>
            <p className="mt-5 text-white/40 max-w-lg mx-auto">
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
          <p className="text-xs text-white/20">VeilReceipt &middot; Privacy-First Commerce on Aleo</p>
          <p className="text-xs text-white/10">Testnet</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
