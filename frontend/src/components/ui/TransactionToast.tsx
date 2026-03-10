// TransactionToast — Global animated transaction progress toast

import { FC, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTxStatusStore, type TxPhase } from '@/stores/txStatusStore';

const PHASES: Record<TxPhase, { label: string; sub: string; pct: number; color: string }> = {
  signing:      { label: 'Awaiting Signature',     sub: 'Approve in Shield wallet',         pct: 10,  color: '#a78bfa' },
  proving:      { label: 'Generating ZK Proof',    sub: 'Building zero-knowledge proof...',  pct: 35,  color: '#38bdf8' },
  broadcasting: { label: 'Broadcasting',           sub: 'Sending to Aleo network...',        pct: 65,  color: '#34d399' },
  confirming:   { label: 'Confirming',             sub: 'Waiting for on-chain confirmation', pct: 85,  color: '#fbbf24' },
  confirmed:    { label: 'Confirmed!',             sub: 'Transaction accepted on-chain',     pct: 100, color: '#22c55e' },
  failed:       { label: 'Failed',                 sub: 'Transaction was rejected',          pct: 100, color: '#f87171' },
};

const ShieldSvg: FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} width="20" height="20">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const CheckSvg: FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className} width="20" height="20">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XSvg: FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className} width="16" height="16">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const TransactionToast: FC = () => {
  const active = useTxStatusStore((s) => s.active);
  const clear = useTxStatusStore((s) => s.clear);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active || active.phase === 'confirmed' || active.phase === 'failed') return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - active.startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [active]);

  // Auto-dismiss after confirmed/failed
  useEffect(() => {
    if (!active) return;
    if (active.phase === 'confirmed' || active.phase === 'failed') {
      const t = setTimeout(clear, active.phase === 'confirmed' ? 5000 : 6000);
      return () => clearTimeout(t);
    }
  }, [active?.phase, clear]);

  const phase = active ? PHASES[active.phase] : null;
  const isTerminal = active?.phase === 'confirmed' || active?.phase === 'failed';
  const isFailed = active?.phase === 'failed';

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <AnimatePresence>
      {active && phase && (
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-6 right-6 z-[9999] w-[340px]"
        >
          <div className="bg-[#0d1117]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
            {/* Progress bar */}
            <div className="h-1 bg-white/5 relative">
              <motion.div
                className="h-full rounded-full"
                style={{ background: phase.color }}
                initial={{ width: '0%' }}
                animate={{ width: `${phase.pct}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>

            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="pt-0.5">
                  {active.phase === 'confirmed' ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      className="w-10 h-10 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center"
                    >
                      <CheckSvg className="text-green-400" />
                    </motion.div>
                  ) : isFailed ? (
                    <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                      <XSvg className="text-red-400" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 relative flex items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-0 rounded-full border-2 border-transparent"
                        style={{ borderTopColor: phase.color, borderRightColor: `${phase.color}40` }}
                      />
                      <ShieldSvg className="text-white/60" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">{phase.label}</p>
                    {!isTerminal && (
                      <span className="text-[11px] text-white/30 font-mono tabular-nums">{formatTime(elapsed)}</span>
                    )}
                  </div>
                  <p className="text-xs text-white/45 mt-0.5">{phase.sub}</p>

                  {/* TX label */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] text-white/25 truncate">{active.label}</span>
                    {active.txId && (
                      <span className="text-[10px] font-mono text-white/20 truncate">
                        {active.txId.slice(0, 14)}...
                      </span>
                    )}
                  </div>
                </div>

                {/* Dismiss on terminal */}
                {isTerminal && (
                  <button onClick={clear} className="text-white/20 hover:text-white/50 transition-colors p-1">
                    <XSvg />
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TransactionToast;
