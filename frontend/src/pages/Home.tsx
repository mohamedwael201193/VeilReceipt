// Home — VeilReceipt full-width landing page with premium animations

import { FC, useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useVeilWallet } from '@/hooks/useVeilWallet';
import { Button } from '@/components/ui/Components';
import PixelBlast from '@/components/effects/PixelBlast';
import { getCurrentBlockHeight } from '@/lib/aleoNetwork';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { VeilLogo, VeilLogoMini } from '@/components/icons/VeilLogo';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import NumberFlow from '@number-flow/react';

gsap.registerPlugin(ScrollTrigger);

/* --- HyperText: text scramble effect inspired by componentry.fun --- */
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';
const HyperText: FC<{ text: string; className?: string; duration?: number }> = ({ text, className = '', duration = 800 }) => {
  const [display, setDisplay] = useState(text);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView || started) return;
    setStarted(true);
    const len = text.length;
    const interval = duration / len;
    let revealedCount = 0;
    const timer = setInterval(() => {
      revealedCount++;
      if (revealedCount >= len) {
        setDisplay(text);
        clearInterval(timer);
        return;
      }
      setDisplay(
        text.slice(0, revealedCount) +
        Array.from({ length: len - revealedCount }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
      );
    }, interval);
    return () => clearInterval(timer);
  }, [isInView, text, duration, started]);

  return <span ref={ref} className={className}>{display}</span>;
};

/* --- SpotlightCard: cursor-tracking glow effect inspired by componentry.fun --- */
const SpotlightCard: FC<{ children: React.ReactNode; className?: string; spotlightColor?: string }> = ({
  children, className = '', spotlightColor = 'rgba(212, 187, 255, 0.08)',
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative overflow-hidden ${className}`}
      style={{ background: isHovered
        ? `radial-gradient(600px circle at ${pos.x}px ${pos.y}px, ${spotlightColor}, transparent 40%)`
        : undefined
      }}
    >
      {children}
    </div>
  );
};

/* --- BorderBeam: animated gradient beam on border inspired by componentry.fun --- */
const BorderBeam: FC<{ size?: number; duration?: number; colorFrom?: string; colorTo?: string }> = ({
  size: _size = 200, duration = 12, colorFrom = '#d4bbff', colorTo = '#7dffa2',
}) => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ borderRadius: 'inherit' }}>
    <div
      className="absolute inset-0"
      style={{
        background: `conic-gradient(from calc(var(--beam-angle) * 1deg), transparent 50%, ${colorFrom}, ${colorTo}, transparent 80%)`,
        mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
        WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
        maskComposite: 'exclude',
        WebkitMaskComposite: 'xor',
        padding: '1px',
        animation: `beam-spin ${duration}s linear infinite`,
      }}
    />
    <style>{`
      @property --beam-angle { syntax: "<number>"; initial-value: 0; inherits: false; }
      @keyframes beam-spin { to { --beam-angle: 360; } }
    `}</style>
  </div>
);

/* --- TextAnimate: staggered character/word reveal inspired by componentry.fun --- */
const TextAnimate: FC<{ children: string; className?: string; by?: 'word' | 'character'; delay?: number }> = ({
  children, className = '', by = 'word', delay = 0,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const segments = by === 'word' ? children.split(' ') : children.split('');

  return (
    <span ref={ref} className={`inline-flex flex-wrap ${className}`}>
      {segments.map((seg, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
          animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
          transition={{ duration: 0.4, delay: delay + i * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="inline-block"
        >
          {seg}{by === 'word' ? '\u00A0' : ''}
        </motion.span>
      ))}
    </span>
  );
};

/* --- AnimatedCounter: number that counts up when scrolled into view --- */
const AnimatedCounter: FC<{ value: number | string; suffix?: string; className?: string }> = ({ value, suffix = '', className = '' }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const numVal = typeof value === 'string' ? parseInt(value, 10) : value;
  const isNum = !isNaN(numVal);

  useEffect(() => {
    if (!isInView || !isNum) return;
    setDisplay(numVal);
  }, [isInView, numVal, isNum]);

  if (!isNum) return <span ref={ref} className={className}>{value}{suffix}</span>;

  return (
    <span ref={ref} className={className}>
      <NumberFlow value={display} trend={1} />
      {suffix}
    </span>
  );
};

/* --- ScrollMarquee: infinite scrolling text band --- */
const ScrollMarquee: FC<{ children: string; speed?: number; className?: string }> = ({ children, speed = 30, className = '' }) => {
  const content = `${children} — `.repeat(8);
  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`}>
      <div
        className="inline-block animate-marquee"
        style={{ animation: `marquee ${speed}s linear infinite` }}
      >
        <span className="inline-block mr-0">{content}</span>
        <span className="inline-block mr-0">{content}</span>
      </div>
      <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
    </div>
  );
};

/* --- MagneticButton: button that slightly follows cursor on hover --- */
const MagneticButton: FC<{ children: React.ReactNode; className?: string; strength?: number }> = ({ children, className = '', strength = 0.3 }) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * strength;
    const y = (e.clientY - rect.top - rect.height / 2) * strength;
    gsap.to(ref.current, { x, y, duration: 0.3, ease: 'power2.out' });
  }, [strength]);

  const handleMouseLeave = useCallback(() => {
    if (!ref.current) return;
    gsap.to(ref.current, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
  }, []);

  return (
    <div ref={ref} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className={`inline-block ${className}`}>
      {children}
    </div>
  );
};

/* --- GradientText: animated gradient text effect --- */
const GradientText: FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span
    className={`bg-clip-text text-transparent bg-[length:200%_200%] animate-gradient-shift ${className}`}
    style={{ backgroundImage: 'linear-gradient(135deg, #d4bbff 0%, #7dffa2 25%, #d4bbff 50%, #7dffa2 75%, #d4bbff 100%)' }}
  >
    {children}
  </span>
);

/* --- Data --- */

const features = [
  {
    icon: 'lock',
    label: 'PRIVATE PAYMENTS',
    desc: 'Pay with three flexible options — Aleo Credits, USDCx, or USAD stablecoins. Your payment details are fully encrypted. No one can see what you bought or how much you paid.',
    detail: 'End-to-end encrypted • Zero data exposure',
  },
  {
    icon: 'receipt_long',
    label: 'ENCRYPTED RECEIPTS',
    desc: 'Get a verifiable digital receipt for every purchase, encrypted and stored only on your device. Share proof of purchase without revealing any personal information.',
    detail: 'Only you can view your receipts',
  },
  {
    icon: 'gavel',
    label: 'BUYER PROTECTION',
    desc: 'Funds are held safely until you confirm your order. If something goes wrong, claim a full refund within the protection window — no middleman needed.',
    detail: 'Automatic refund window • No disputes required',
  },
  {
    icon: 'verified_user',
    label: 'PROOF OF PURCHASE',
    desc: 'Need to contact support or make a warranty claim? Generate a shareable proof code that verifies your purchase without revealing payment details.',
    detail: 'Share with merchants securely',
  },
  {
    icon: 'token',
    label: 'LOYALTY REWARDS',
    desc: 'Earn tiered loyalty tokens based on your purchase history — Bronze, Silver, Gold, Platinum, and Diamond. Unlock exclusive perks and discounts privately.',
    detail: '5 reward tiers • Fully anonymous',
  },
  {
    icon: 'reviews',
    label: 'HONEST REVIEWS',
    desc: 'Leave verified star ratings without exposing your identity. Only real buyers can review, and each purchase allows only one review — keeping feedback authentic.',
    detail: 'Verified buyers only • No fake reviews',
  },
  {
    icon: 'shopping_bag',
    label: 'SMART CART',
    desc: 'Add up to 4 items per transaction and prove any individual item from your cart later. Perfect for returns, warranties, or selective proof sharing.',
    detail: 'Selective item verification',
  },
  {
    icon: 'storefront',
    label: 'MERCHANT TOOLS',
    desc: 'Merchants get a full dashboard with sales analytics, customer verification tools, and multi-token revenue tracking — all while respecting buyer privacy.',
    detail: 'Privacy-respecting commerce',
  },
];

const stats = [
  { label: 'PRIVACY', value: '100%', sub: 'Fully encrypted transactions' },
  { label: 'PAYMENT OPTIONS', value: '3', sub: 'Credits · USDCx · USAD' },
  { label: 'REWARD TIERS', value: '5', sub: 'Bronze to Diamond' },
  { label: 'DATA EXPOSED', value: '0', sub: 'Zero personal info leaked' },
];

const steps = [
  { num: '01', label: 'CONNECT YOUR WALLET', desc: 'Link your Aleo wallet in one click. Your identity stays private — we never see your personal information.', icon: 'account_balance_wallet' },
  { num: '02', label: 'CHOOSE HOW TO PAY', desc: 'Pick your preferred payment method — Credits, USDCx, or USAD stablecoins. Want extra protection? Enable buyer escrow for risk-free purchases.', icon: 'shield_lock' },
  { num: '03', label: 'COMPLETE YOUR ORDER', desc: 'Checkout happens in a single secure transaction. You and the merchant each receive an encrypted receipt — no personal data shared.', icon: 'bolt' },
  { num: '04', label: 'UNLOCK YOUR BENEFITS', desc: 'Generate proof codes for support, earn loyalty rewards, leave anonymous reviews, and verify individual items from your cart — all privately.', icon: 'verified' },
];

const techStack = [
  { label: 'ENCRYPTION', value: 'Military-Grade', sub: 'Zero-knowledge proofs' },
  { label: 'BLOCKCHAIN', value: 'Aleo Network', sub: 'Privacy-first L1' },
  { label: 'PAYMENTS', value: '3 Tokens', sub: 'Credits · USDCx · USAD' },
  { label: 'PROTECTION', value: 'Built-in Escrow', sub: 'Automatic refunds' },
  { label: 'REWARDS', value: '5 Loyalty Tiers', sub: 'Bronze → Diamond' },
  { label: 'UPTIME', value: '24/7', sub: 'Always available' },
];

/* --- Animated section wrapper with blur-up --- */
const FadeInSection: FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className = '', delay = 0 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, filter: 'blur(6px)' }}
      animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* --- Main Component --- */
const Home: FC = () => {
  const { connected, address } = useVeilWallet();
  const [blockHeight, setBlockHeight] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -80]);

  useEffect(() => {
    getCurrentBlockHeight().then(setBlockHeight);
    const interval = setInterval(() => getCurrentBlockHeight().then(setBlockHeight), 30000);
    return () => clearInterval(interval);
  }, []);

  /* GSAP ScrollTrigger animations for sections */
  useGSAP(() => {
    // Staggered feature cards entrance
    gsap.utils.toArray<HTMLElement>('.gsap-feature-card').forEach((card, i) => {
      gsap.fromTo(card,
        { y: 60, opacity: 0, scale: 0.92 },
        { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out', delay: i * 0.08,
          scrollTrigger: { trigger: card, start: 'top 88%', toggleActions: 'play none none none' }
        }
      );
    });

    // Steps slide-in
    gsap.utils.toArray<HTMLElement>('.gsap-step-card').forEach((card, i) => {
      gsap.fromTo(card,
        { x: i % 2 === 0 ? -50 : 50, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8, ease: 'power2.out',
          scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' }
        }
      );
    });

    // Tech/trust cards cascade
    gsap.utils.toArray<HTMLElement>('.gsap-trust-card').forEach((card, i) => {
      gsap.fromTo(card,
        { y: 30, opacity: 0, rotateX: 8 },
        { y: 0, opacity: 1, rotateX: 0, duration: 0.6, ease: 'power2.out', delay: i * 0.06,
          scrollTrigger: { trigger: card, start: 'top 90%', toggleActions: 'play none none none' }
        }
      );
    });

    // CTA section zoom-in
    const ctaEl = document.querySelector('.gsap-cta-section');
    if (ctaEl) {
      gsap.fromTo(ctaEl,
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: ctaEl, start: 'top 80%', toggleActions: 'play none none none' }
        }
      );
    }
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="relative min-h-screen bg-[#050505] text-[#e5e2e1] overflow-x-hidden">
      {/* PixelBlast Background — behind everything, non-interactive */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <PixelBlast
          variant="square"
          pixelSize={4}
          color="#B19EEF"
          patternScale={2}
          patternDensity={0.6}
          pixelSizeJitter={0}
          enableRipples
          rippleSpeed={0.4}
          rippleThickness={0.12}
          rippleIntensityScale={1.0}
          liquid={false}
          liquidStrength={0.12}
          liquidRadius={1.2}
          liquidWobbleSpeed={5}
          speed={0.3}
          edgeFade={0.4}
          transparent
        />
      </div>

      {/* --- LANDING NAV --- */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 py-4 bg-[#050505]/90 backdrop-blur-xl border-b border-[#d4bbff]/10">
        <div className="flex items-center gap-3">
          <VeilLogoMini size={28} />
          <span className="font-headline text-lg font-bold tracking-tighter text-[#d4bbff]">VEIL_RECEIPT</span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-[10px] font-mono tracking-widest text-[#c9c6c5] hover:text-[#d4bbff] transition-colors uppercase">FEATURES</a>
          <a href="#how-it-works" className="text-[10px] font-mono tracking-widest text-[#c9c6c5] hover:text-[#d4bbff] transition-colors uppercase">HOW IT WORKS</a>
          <a href="#privacy" className="text-[10px] font-mono tracking-widest text-[#c9c6c5] hover:text-[#d4bbff] transition-colors uppercase">PRIVACY</a>
          <a href="#merchants" className="text-[10px] font-mono tracking-widest text-[#c9c6c5] hover:text-[#d4bbff] transition-colors uppercase">MERCHANTS</a>
        </nav>
        <div className="flex items-center gap-3">
          {connected && address && (
            <span className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-[#7dffa2]">
              <span className="w-1.5 h-1.5 bg-[#7dffa2] animate-pulse" />
              {address.slice(0, 8)}...{address.slice(-6)}
            </span>
          )}
          <WalletMultiButton />
        </div>
      </header>

      {/* --- HERO --- */}
      <section ref={heroRef} className="relative z-10 min-h-screen flex items-center pt-20">
        <motion.div style={{ opacity: heroOpacity, y: heroY }} className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: Text content */}
            <div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="inline-flex items-center gap-2 mb-8 px-4 py-2 bg-[#1c1b1b]/80 border border-[#d4bbff]/15">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full bg-[#7dffa2] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 bg-[#7dffa2]" />
                </span>
                <span className="text-[10px] font-mono tracking-widest uppercase text-[#7dffa2]">LIVE ON ALEO</span>
                <span className="text-[10px] font-mono tracking-widest text-[#c9c6c5]/40 ml-2">Private Commerce Protocol</span>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }}>
                <p className="text-[10px] font-mono tracking-widest text-[#c9c6c5]/50 mb-4">// PRIVATE_COMMERCE_FOR_EVERYONE</p>
                <h1 className="font-headline text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black uppercase leading-[0.95] tracking-tight">
                  <HyperText text="Buy Anything." className="text-[#e5e2e1] block" duration={600} />
                  <HyperText text="Prove Everything." className="text-[#e5e2e1] block" duration={800} />
                  <GradientText className="block font-headline text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black uppercase leading-[0.95] tracking-tight">
                    Reveal Nothing.
                  </GradientText>
                </h1>
              </motion.div>

              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }} className="mt-8 text-sm sm:text-base text-[#c9c6c5]/80 max-w-lg leading-relaxed font-body">
                Shop online without exposing your identity. VeilReceipt gives you encrypted payments, verifiable receipts, built-in buyer protection, loyalty rewards, and anonymous reviews — all without sharing a single piece of personal data.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }} className="mt-10 flex flex-wrap gap-3">
                <MagneticButton strength={0.25}>
                  <Link to="/checkout">
                    <Button variant="glow" size="lg">
                      <span className="material-symbols-outlined text-base">shopping_cart</span>
                      Enter Shop
                    </Button>
                  </Link>
                </MagneticButton>
                <MagneticButton strength={0.25}>
                  <Link to="/merchant">
                    <Button variant="secondary" size="lg">
                      <span className="material-symbols-outlined text-base">storefront</span>
                      Merchant Portal
                    </Button>
                  </Link>
                </MagneticButton>
                <MagneticButton strength={0.25}>
                  <Link to="/verify">
                    <Button variant="ghost" size="lg">
                      <span className="material-symbols-outlined text-base">verified_user</span>
                      Verify Proof
                    </Button>
                  </Link>
                </MagneticButton>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 1 }} className="mt-10 flex flex-wrap gap-6">
                {['100% Private', 'Encrypted Receipts', 'Buyer Protection', 'Loyalty Rewards'].map((t) => (
                  <span key={t} className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-[#c9c6c5]/30">
                    <span className="w-1.5 h-1.5 bg-[#7dffa2]/40" />
                    {t}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Right: Key benefits showcase */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 1 }} className="hidden lg:flex flex-col gap-4">
              <div className="relative p-6 bg-[#0e0d0d]/95 border border-[#d4bbff]/15 overflow-hidden backdrop-blur-sm">
                <BorderBeam size={150} duration={10} />
                <p className="text-[10px] font-mono tracking-widest text-[#7dffa2] mb-3">// WHY VEILRECEIPT</p>
                <div className="flex items-center gap-3 mb-4">
                  <VeilLogo size={40} animated={false} />
                  <div>
                    <p className="font-headline text-lg font-bold text-[#e5e2e1]">Your Privacy, Protected</p>
                    <p className="text-[10px] font-mono text-[#7dffa2]/60">POWERED BY ALEO BLOCKCHAIN</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {stats.map((s) => (
                    <div key={s.label} className="bg-[#080808]/90 border border-[#d4bbff]/10 p-3">
                      <p className="text-2xl font-headline font-bold text-[#d4bbff] tabular-nums"><AnimatedCounter value={s.value} suffix={s.value === '100%' ? '%' : ''} /></p>
                      <p className="text-[9px] font-mono tracking-widest text-[#c9c6c5]/40">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Trust indicators */}
              <div className="relative p-5 bg-[#080808]/95 border border-[#7dffa2]/15 overflow-hidden backdrop-blur-sm">
                <BorderBeam size={100} duration={15} colorFrom="#7dffa2" colorTo="#d4bbff" />
                <div className="space-y-3">
                  {[
                    { icon: 'visibility_off', text: 'No one sees what you buy' },
                    { icon: 'lock', text: 'Payments encrypted end-to-end' },
                    { icon: 'verified', text: 'Receipts only you can access' },
                    { icon: 'security', text: 'Built on proven cryptography' },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#7dffa2] text-base">{item.icon}</span>
                      <span className="text-xs font-body text-[#c9c6c5]/70">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5, duration: 0.8 }} className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-[10px] font-mono tracking-widest text-[#c9c6c5]/30">SCROLL</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }} className="w-px h-8 bg-gradient-to-b from-[#d4bbff]/40 to-transparent" />
        </motion.div>
      </section>

      {/* --- PROBLEM STATEMENT --- */}
      <section className="relative z-10 py-24 border-t border-[#d4bbff]/10 bg-[#050505]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <FadeInSection>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <p className="text-[10px] font-mono tracking-widest text-[#7dffa2] mb-3">// THE PROBLEM</p>
                <h2 className="font-headline text-3xl sm:text-4xl font-bold uppercase tracking-tight mb-6">
                  <TextAnimate className="text-[#e5e2e1]" by="word">Every Purchase</TextAnimate>{' '}
                  <span className="text-[#ffb4ab]">Leaks Your Data</span>
                </h2>
                <p className="text-sm text-[#c9c6c5]/80 leading-relaxed font-body mb-6">
                  Traditional shopping exposes everything — your name, payment details, what you bought, and when. Even on most blockchains, every transaction is permanently visible to anyone.
                </p>
                <p className="text-sm text-[#c9c6c5]/80 leading-relaxed font-body">
                  VeilReceipt changes that. We built a complete shopping experience where your privacy is the default, not an afterthought.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { problem: 'Exposed transactions', solution: 'Fully encrypted payments', icon: 'visibility_off' },
                  { problem: 'No private receipts', solution: 'Encrypted digital receipts', icon: 'receipt_long' },
                  { problem: 'No buyer protection', solution: 'Built-in escrow refunds', icon: 'gavel' },
                  { problem: 'Identity-linked reviews', solution: 'Anonymous verified reviews', icon: 'reviews' },
                ].map((item, i) => (
                  <motion.div key={item.problem} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                    <SpotlightCard className="bg-[#0e0d0d]/95 border border-[#d4bbff]/12 p-5 hover:border-[#d4bbff]/30 transition-all h-full backdrop-blur-sm" spotlightColor="rgba(125, 255, 162, 0.06)">
                      <span className="material-symbols-outlined text-[#d4bbff] text-xl mb-4 block">{item.icon}</span>
                      <p className="text-[11px] font-mono tracking-widest text-[#ffb4ab]/70 line-through mb-1.5">{item.problem}</p>
                      <p className="text-[11px] font-mono tracking-widest text-[#7dffa2] font-medium">{item.solution}</p>
                    </SpotlightCard>
                  </motion.div>
                ))}
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* --- SCROLL MARQUEE --- */}
      <section className="relative z-10 py-6 border-t border-[#d4bbff]/10 bg-[#080808]/90 overflow-hidden">
        <ScrollMarquee speed={60} className="text-xl sm:text-2xl font-headline font-bold uppercase tracking-widest text-[#d4bbff]/10">
          PRIVATE PAYMENTS — ENCRYPTED RECEIPTS — BUYER PROTECTION — LOYALTY REWARDS — ZERO DATA EXPOSED — ANONYMOUS REVIEWS — PROOF OF PURCHASE — SMART CART
        </ScrollMarquee>
      </section>

      {/* --- LIVE STATS --- */}
      <section className="relative z-10 py-12 border-t border-[#d4bbff]/10 bg-[#080808]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-[#0e0d0d]/95 border border-[#7dffa2]/20 p-4">
              <p className="text-[10px] font-mono tracking-widest text-[#c9c6c5]/50 mb-1">NETWORK STATUS</p>
              <p className="text-2xl font-headline font-bold text-[#7dffa2] tabular-nums">{blockHeight > 0 ? blockHeight.toLocaleString() : '...'}</p>
              <p className="text-[10px] font-mono text-[#c9c6c5]/30 mt-0.5">Live block height</p>
            </motion.div>
            {stats.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i + 1) * 0.06 }} className="bg-[#0e0d0d]/95 border border-[#d4bbff]/12 p-4">
                <p className="text-[10px] font-mono tracking-widest text-[#c9c6c5]/60 mb-1">{stat.label}</p>
                <p className="text-2xl font-headline font-bold text-[#e5e2e1] tabular-nums"><AnimatedCounter value={stat.value} suffix={stat.value === '100%' ? '%' : ''} /></p>
                <p className="text-[10px] font-mono text-[#d4bbff]/50 mt-0.5">{stat.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FEATURES --- */}
      <section id="features" className="relative z-10 py-24 border-t border-[#d4bbff]/10 bg-[#050505]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <FadeInSection>
            <p className="text-[10px] font-mono tracking-widest text-[#7dffa2] mb-3">// EVERYTHING YOU NEED</p>
            <h2 className="font-headline text-3xl sm:text-4xl font-bold uppercase tracking-tight mb-4">
              <TextAnimate className="text-[#e5e2e1]" by="word">Complete Privacy.</TextAnimate>{' '}
              <span className="text-[#d4bbff] italic">Zero Compromise.</span>
            </h2>
            <p className="text-sm text-[#c9c6c5]/50 max-w-2xl mb-14 font-body">
              From encrypted payments to anonymous reviews, every feature is designed to protect your identity. No personal data is ever stored, shared, or exposed.
            </p>
          </FadeInSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feat) => (
              <div key={feat.label} className="gsap-feature-card opacity-0">
                <SpotlightCard className="h-full bg-[#0e0d0d]/95 border border-[#d4bbff]/12 p-6 hover:border-[#d4bbff]/30 hover:shadow-[0_0_30px_rgba(212,187,255,0.06)] transition-all duration-500 group backdrop-blur-sm hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[#d4bbff]/8 border border-[#d4bbff]/15 flex items-center justify-center group-hover:bg-[#7dffa2]/10 group-hover:border-[#7dffa2]/25 transition-all duration-500">
                      <span className="material-symbols-outlined text-[#d4bbff] text-lg group-hover:text-[#7dffa2] transition-colors duration-500">{feat.icon}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono tracking-widest text-[#d4bbff] block mb-3 font-medium">{feat.label}</span>
                  <p className="text-xs text-[#c9c6c5]/70 leading-relaxed mb-4 font-body">{feat.desc}</p>
                  <div className="pt-3 border-t border-[#d4bbff]/8">
                    <p className="text-[9px] font-mono text-[#7dffa2]/50 leading-relaxed break-all">{feat.detail}</p>
                  </div>
                  <div className="mt-4 h-px w-8 bg-[#d4bbff]/10 group-hover:w-full group-hover:bg-gradient-to-r group-hover:from-[#d4bbff]/30 group-hover:to-[#7dffa2]/30 transition-all duration-700" />
                </SpotlightCard>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section id="how-it-works" className="relative z-10 py-24 border-t border-[#d4bbff]/10 bg-[#080808]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <FadeInSection>
            <p className="text-[10px] font-mono tracking-widest text-[#7dffa2] mb-3">// GETTING STARTED</p>
            <h2 className="font-headline text-3xl sm:text-4xl font-bold uppercase tracking-tight mb-4">
              <TextAnimate className="text-[#e5e2e1]" by="word">Shop Privately in</TextAnimate>{' '}
              <span className="text-[#d4bbff] italic">4 Simple Steps</span>
            </h2>
            <p className="text-sm text-[#c9c6c5]/50 max-w-2xl mb-14 font-body">
              Getting started takes less than a minute. Connect your wallet, make a purchase, and enjoy full privacy with every transaction.
            </p>
          </FadeInSection>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {steps.map((step, i) => (
              <div key={step.num} className="gsap-step-card opacity-0">
                <SpotlightCard className="relative flex gap-6 items-start p-8 bg-[#0e0d0d]/95 border border-[#d4bbff]/12 hover:border-[#7dffa2]/25 hover:shadow-[0_0_25px_rgba(125,255,162,0.04)] transition-all group h-full backdrop-blur-sm">
                  <BorderBeam size={120} duration={14 + i * 2} colorFrom={i % 2 === 0 ? '#d4bbff' : '#7dffa2'} colorTo={i % 2 === 0 ? '#7dffa2' : '#d4bbff'} />
                  <span className="absolute top-4 right-4 font-headline text-6xl font-black text-[#d4bbff]/[0.04] tabular-nums select-none">{step.num}</span>
                  <div className="w-12 h-12 bg-[#d4bbff]/10 border border-[#d4bbff]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#7dffa2]/10 group-hover:border-[#7dffa2]/20 transition-colors">
                    <span className="material-symbols-outlined text-[#d4bbff] group-hover:text-[#7dffa2] transition-colors">{step.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-xs font-mono tracking-widest text-[#e5e2e1] mb-2">{step.label}</h3>
                    <p className="text-sm text-[#c9c6c5]/70 leading-relaxed font-body">{step.desc}</p>
                  </div>
                </SpotlightCard>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- PRIVACY & SECURITY --- */}
      <section id="privacy" className="relative z-10 py-24 border-t border-[#d4bbff]/10 bg-[#050505]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <FadeInSection>
            <p className="text-[10px] font-mono tracking-widest text-[#7dffa2] mb-3">// YOUR PRIVACY MATTERS</p>
            <h2 className="font-headline text-3xl sm:text-4xl font-bold uppercase tracking-tight mb-6">
              <HyperText text="How We Protect You" className="text-[#e5e2e1]" duration={1200} />
            </h2>
          </FadeInSection>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <FadeInSection delay={0.1}>
              <SpotlightCard className="bg-[#0e0d0d]/95 border border-[#d4bbff]/12 p-6 relative overflow-hidden backdrop-blur-sm">
                <BorderBeam size={180} duration={18} />
                <p className="text-[10px] font-mono tracking-widest text-[#d4bbff] mb-4">PRIVACY GUARANTEES</p>
                <div className="space-y-4">
                  {[
                    { icon: 'visibility_off', title: 'Hidden Purchase Details', desc: 'What you buy, how much you pay, and who you are — all encrypted. No one can trace your shopping activity.' },
                    { icon: 'lock', title: 'Encrypted Receipts', desc: 'Your receipts are stored in encrypted records that only your wallet can decrypt. Not even we can read them.' },
                    { icon: 'shield', title: 'No Data Collection', desc: 'We don\'t store your name, email, address, or any personal information. Zero data means zero risk.' },
                    { icon: 'fingerprint', title: 'Anonymous Identity', desc: 'Your wallet address is never linked to your purchases on the blockchain. Complete unlinkability by design.' },
                    { icon: 'verified_user', title: 'Selective Disclosure', desc: 'Share only what you choose. Prove you bought something without revealing what, when, or how much you paid.' },
                  ].map((item, i) => (
                    <motion.div key={item.title} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="flex gap-4 items-start">
                      <div className="w-10 h-10 bg-[#d4bbff]/8 border border-[#d4bbff]/15 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-[#d4bbff] text-lg">{item.icon}</span>
                      </div>
                      <div>
                        <p className="text-xs font-mono tracking-widest text-[#e5e2e1] mb-1">{item.title}</p>
                        <p className="text-sm text-[#c9c6c5]/70 leading-relaxed font-body">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </SpotlightCard>
            </FadeInSection>
            <div className="space-y-6">
              <FadeInSection delay={0.2}>
                <SpotlightCard className="bg-[#0e0d0d]/95 border border-[#d4bbff]/12 p-6 relative overflow-hidden backdrop-blur-sm">
                  <p className="text-[10px] font-mono tracking-widest text-[#d4bbff] mb-4">USE CASES</p>
                  <div className="space-y-4">
                    {[
                      { title: 'Private Shopping', desc: 'Buy products online without leaving a trace. No purchase history visible to anyone.', icon: 'shopping_bag' },
                      { title: 'Warranty Claims', desc: 'Prove you bought a product for warranty or returns — without revealing the price you paid.', icon: 'build' },
                      { title: 'Subscription Access', desc: 'Unlock exclusive content and perks with loyalty tokens earned from your purchases.', icon: 'card_membership' },
                      { title: 'Honest Feedback', desc: 'Write product reviews that merchants trust, while staying completely anonymous.', icon: 'rate_review' },
                    ].map((item, i) => (
                      <motion.div key={item.title} initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="flex gap-4 items-start">
                        <div className="w-10 h-10 bg-[#7dffa2]/8 border border-[#7dffa2]/15 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-[#7dffa2] text-lg">{item.icon}</span>
                        </div>
                        <div>
                          <p className="text-xs font-mono tracking-widest text-[#e5e2e1] mb-1">{item.title}</p>
                          <p className="text-sm text-[#c9c6c5]/70 leading-relaxed font-body">{item.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </SpotlightCard>
              </FadeInSection>
              <FadeInSection delay={0.3}>
                <SpotlightCard className="bg-[#0e0d0d]/95 border border-[#d4bbff]/12 p-6 relative overflow-hidden backdrop-blur-sm">
                  <BorderBeam size={140} duration={20} colorFrom="#7dffa2" colorTo="#d4bbff" />
                  <p className="text-[10px] font-mono tracking-widest text-[#d4bbff] mb-4">COMPARISON</p>
                  <div className="space-y-3">
                    {[
                      { feature: 'Payment Privacy', trad: 'Fully visible', veil: 'Fully encrypted' },
                      { feature: 'Receipt Storage', trad: 'Company servers', veil: 'Your wallet only' },
                      { feature: 'Buyer Protection', trad: 'Dispute process', veil: 'Automatic escrow' },
                      { feature: 'Review Identity', trad: 'Name visible', veil: 'Anonymous' },
                      { feature: 'Data Collected', trad: 'Everything', veil: 'Nothing' },
                    ].map((row) => (
                      <div key={row.feature} className="grid grid-cols-3 gap-2 items-center py-1.5 border-b border-[#d4bbff]/5 last:border-0">
                        <span className="text-xs font-mono text-[#e5e2e1]/80">{row.feature}</span>
                        <span className="text-[10px] font-mono text-[#ffb4ab]/60 text-center">{row.trad}</span>
                        <span className="text-[10px] font-mono text-[#7dffa2] text-center font-medium">{row.veil}</span>
                      </div>
                    ))}
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <span className="text-[9px] font-mono text-[#c9c6c5]/40"></span>
                      <span className="text-[9px] font-mono text-[#ffb4ab]/40 text-center">Traditional</span>
                      <span className="text-[9px] font-mono text-[#7dffa2]/60 text-center">VeilReceipt</span>
                    </div>
                  </div>
                </SpotlightCard>
              </FadeInSection>
            </div>
          </div>
        </div>
      </section>

      {/* --- WHY VEILRECEIPT --- */}
      <section id="tech" className="relative z-10 py-24 border-t border-[#d4bbff]/10 bg-[#080808]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <FadeInSection>
            <p className="text-[10px] font-mono tracking-widest text-[#7dffa2] mb-3">// WHY CHOOSE US</p>
            <h2 className="font-headline text-3xl sm:text-4xl font-bold text-[#e5e2e1] uppercase tracking-tight mb-14">
              <TextAnimate className="text-[#e5e2e1]" by="word">Built on Trust.</TextAnimate>{' '}
              <span className="text-[#d4bbff] italic">Backed by Math.</span>
            </h2>
          </FadeInSection>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {techStack.map((tech) => (
              <div key={tech.label} className="gsap-trust-card opacity-0">
                <SpotlightCard className="bg-[#0e0d0d]/95 border border-[#d4bbff]/12 p-5 text-center hover:border-[#d4bbff]/25 hover:shadow-[0_0_20px_rgba(212,187,255,0.05)] transition-all h-full backdrop-blur-sm hover:-translate-y-1">
                  <p className="text-[10px] font-mono tracking-widest text-[#c9c6c5]/60 mb-2">{tech.label}</p>
                  <p className="text-sm font-headline font-bold text-[#e5e2e1]">{tech.value}</p>
                  <p className="text-[10px] font-mono text-[#d4bbff]/50 mt-1">{tech.sub}</p>
                </SpotlightCard>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FOR MERCHANTS --- */}
      <section id="merchants" className="relative z-10 py-24 border-t border-[#d4bbff]/10 bg-[#050505]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeInSection>
              <p className="text-[10px] font-mono tracking-widest text-[#7dffa2] mb-3">// FOR MERCHANTS</p>
              <h2 className="font-headline text-3xl sm:text-4xl font-bold text-[#e5e2e1] uppercase tracking-tight mb-6">
                Grow Your Business <span className="text-[#d4bbff] italic">Privately</span>
              </h2>
              <div className="space-y-4">
                {[
                  { step: 'Create your store', desc: 'Set up your merchant profile and start listing products in minutes.' },
                  { step: 'Accept private payments', desc: 'Receive payments in Credits, USDCx, or USAD — all handled seamlessly.' },
                  { step: 'Track your revenue', desc: 'Full sales dashboard with analytics split by payment method.' },
                  { step: 'Verify customers', desc: 'Customers share proof codes to verify purchases — no personal data needed.' },
                  { step: 'Build reputation', desc: 'Receive anonymous but verified reviews from real buyers only.' },
                ].map((item, i) => (
                  <motion.div key={item.step} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="flex gap-4 items-start">
                    <div className="w-6 h-6 bg-[#d4bbff]/10 border border-[#d4bbff]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] font-mono text-[#d4bbff]">{i + 1}</span>
                    </div>
                    <div>
                      <p className="text-xs font-mono tracking-widest text-[#e5e2e1] mb-0.5">{item.step}</p>
                      <p className="text-sm text-[#c9c6c5]/50 font-body">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-8">
                <Link to="/merchant">
                  <Button variant="secondary" size="lg">
                    <span className="material-symbols-outlined text-base">storefront</span>
                    Open Merchant Portal
                  </Button>
                </Link>
              </div>
            </FadeInSection>
            <FadeInSection delay={0.2}>
              <SpotlightCard className="bg-[#0e0d0d]/95 border border-[#d4bbff]/12 p-8 relative overflow-hidden backdrop-blur-sm">
                <BorderBeam size={160} duration={16} />
                <p className="text-[10px] font-mono tracking-widest text-[#7dffa2] mb-4">// INTEGRATION</p>
                <h3 className="font-headline text-xl font-bold text-[#e5e2e1] uppercase tracking-tight mb-4">E-Commerce Ready</h3>
                <p className="text-sm text-[#c9c6c5]/70 font-body mb-6">
                  Integrate VeilReceipt into your existing online store with our REST API. Accept private payments, manage orders, and handle customer support — all through a simple API.
                </p>
                <div className="space-y-2 mb-6">
                  {['Simple API integration', 'Payment session management', 'Real-time notifications', 'Embeddable checkout', 'Full documentation'].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <span className="w-1 h-1 bg-[#7dffa2]" />
                      <span className="text-xs font-mono text-[#c9c6c5]/70">{item}</span>
                    </div>
                  ))}
                </div>
                <Link to="/integrate">
                  <Button variant="ghost" size="md">
                    <span className="material-symbols-outlined text-base">bolt</span>
                    View API Docs
                  </Button>
                </Link>
              </SpotlightCard>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* --- CTA --- */}
      <section className="relative z-10 py-32 border-t border-[#d4bbff]/10 bg-[#050505]/80 backdrop-blur-sm gsap-cta-section">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <FadeInSection>
            <div className="text-center">
              <p className="text-[10px] font-mono tracking-widest text-[#7dffa2] mb-6">// START NOW</p>
              <h2 className="font-headline text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight">
                <TextAnimate className="text-[#e5e2e1]" by="word">Ready to Shop</TextAnimate><br />
                <GradientText className="font-headline text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight italic">Without a Trace?</GradientText>
              </h2>
              <p className="mt-6 text-[#c9c6c5]/70 max-w-xl mx-auto text-sm font-body leading-relaxed">
                Connect your wallet and start shopping with complete privacy. Every payment is encrypted, every receipt is yours alone, and your identity stays hidden.
              </p>
              <div className="mt-12 flex flex-wrap justify-center gap-4">
                <MagneticButton strength={0.2}>
                  <Link to="/checkout">
                    <Button variant="glow" size="lg">
                      <span className="material-symbols-outlined text-base">shopping_cart</span>
                      Start Shopping
                    </Button>
                  </Link>
                </MagneticButton>
                <MagneticButton strength={0.2}>
                  <Link to="/receipts">
                    <Button variant="secondary" size="lg">
                      <span className="material-symbols-outlined text-base">receipt_long</span>
                      My Receipts
                    </Button>
                  </Link>
                </MagneticButton>
                <MagneticButton strength={0.2}>
                  <Link to="/merchant">
                  <Button variant="ghost" size="lg">
                    <span className="material-symbols-outlined text-base">storefront</span>
                    I'm a Merchant
                  </Button>
                </Link>
                </MagneticButton>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="relative z-10 border-t border-[#d4bbff]/10 py-10 bg-[#050505]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <VeilLogoMini size={20} />
            <span className="text-[10px] font-mono tracking-widest text-[#c9c6c5]/30">VEILRECEIPT // PRIVATE COMMERCE</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-mono text-[#d4bbff]/30">Powered by Aleo</span>
            <span className="text-[10px] font-mono text-[#7dffa2]/30">100% PRIVATE</span>
          </div>
        </div>
      </footer>

      {/* --- HUD Decorations --- */}
      <div className="hidden xl:block fixed top-1/2 left-4 -translate-y-1/2 -rotate-90 pointer-events-none z-20">
        <span className="text-[10px] font-mono text-[#d4bbff]/20 tracking-[1em] uppercase">PRIVATE_COMMERCE</span>
      </div>
      <div className="hidden xl:block fixed bottom-10 right-10 pointer-events-none z-20">
        <div className="flex items-end gap-2">
          <div className="w-1 h-32 bg-gradient-to-t from-[#d4bbff]/20 to-transparent" />
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-[#7dffa2]">PRIVACY: 100%</span>
            <span className="text-[10px] font-mono text-[#d4bbff]/40 tracking-tighter">Your data, your control</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
