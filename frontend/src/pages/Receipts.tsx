// Receipts Page — Cosmic glassmorphism receipts, escrow, loyalty, support proofs

import { FC, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useVeilWallet } from '@/hooks/useVeilWallet';
import { Button, Card, Badge, EmptyState, Input, Modal, PillNav, SectionHeader } from '@/components/ui/Components';
import { LoadingSpinner, PulseIndicator, TokenAmount, TokenIcon } from '@/components/icons/Icons';
import {
  ReceiptIcon,
  ShieldIcon,
  ClockIcon,
  LoyaltyIcon,
  RefreshIcon,
  CheckIcon,
  AlertIcon,
  ExternalLinkIcon,
} from '@/components/icons/Icons';
import { FloatingParticles, GridBackground, GlowOrb } from '@/components/effects/CosmicBackground';
import { truncateAddress, formatDate, computeReasonHash } from '@/lib/utils';
import { formatCredits, formatUsdcx } from '@/lib/stablecoin';
import { ESCROW_RETURN_WINDOW } from '@/lib/chain';
import { usePendingTxStore } from '@/stores/txStore';
import type { BuyerReceiptRecord, MerchantReceiptRecord, EscrowReceiptRecord, LoyaltyStampRecord } from '@/lib/types';

type TabId = 'receipts' | 'sales' | 'escrow' | 'loyalty';

const Receipts: FC = () => {
  const {
    connected, address,
    getBuyerReceipts, getMerchantReceipts, getEscrowReceipts, getLoyaltyStamps,
    completeEscrow, refundEscrow,
    claimLoyalty, mergeLoyalty, proveLoyaltyTier,
    provePurchaseSupport,
  } = useVeilWallet();

  const [tab, setTab] = useState<TabId>('receipts');
  const [receipts, setReceipts] = useState<BuyerReceiptRecord[]>([]);
  const [merchantReceipts, setMerchantReceipts] = useState<MerchantReceiptRecord[]>([]);
  const [escrows, setEscrows] = useState<EscrowReceiptRecord[]>([]);
  const [stamps, setStamps] = useState<LoyaltyStampRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Loyalty prove modal
  const [proveModalOpen, setProveModalOpen] = useState(false);
  const [proveThreshold, setProveThreshold] = useState('3');
  const [proveVerifier, setProveVerifier] = useState('');
  const [selectedStamp, setSelectedStamp] = useState<LoyaltyStampRecord | null>(null);

  // Refund modal
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [selectedEscrow, setSelectedEscrow] = useState<EscrowReceiptRecord | null>(null);

  const pendingTxs = usePendingTxStore((s) => s.transactions);
  // Only show real on-chain at1 entries — hide shield_temp artifacts
  const displayedTxs = pendingTxs.filter(tx => tx.txId.startsWith('at1'));

  // On mount: any at1 still marked pending might have already confirmed (poll ended early).
  // Re-check them against RPC and auto-confirm if found.
  useEffect(() => {
    const network = import.meta.env.VITE_ALEO_NETWORK || 'testnet';
    const rpc = import.meta.env.VITE_ALEO_RPC_URL || 'https://api.explorer.provable.com/v1';
    const store = usePendingTxStore.getState();
    const stuckPending = store.transactions.filter(
      tx => tx.txId.startsWith('at1') && tx.status === 'pending'
    );
    if (stuckPending.length === 0) return;
    stuckPending.forEach(async (tx) => {
      try {
        const res = await fetch(`${rpc}/${network}/transaction/${tx.txId}`);
        if (res.ok) {
          usePendingTxStore.getState().confirmTransaction(tx.txId);
        }
      } catch { /* not yet on-chain, leave pending */ }
    });
  }, []);

  const loadRecords = useCallback(async () => {
    if (!connected) return;
    setLoadingRecords(true);
    try {
      const [r, mr, e, s] = await Promise.all([
        getBuyerReceipts(),
        getMerchantReceipts(),
        getEscrowReceipts(),
        getLoyaltyStamps(),
      ]);
      setReceipts(r);
      setMerchantReceipts(mr);
      setEscrows(e);
      setStamps(s);
    } catch (err) {
      console.error('Failed to load records:', err);
      toast.error('Failed to load on-chain records');
    } finally {
      setLoadingRecords(false);
    }
  }, [connected, getBuyerReceipts, getMerchantReceipts, getEscrowReceipts, getLoyaltyStamps]);

  useEffect(() => {
    if (connected) loadRecords();
  }, [connected, loadRecords]);

  // Escrow actions
  const handleCompleteEscrow = async (escrow: EscrowReceiptRecord) => {
    setActionLoading(escrow.purchase_commitment);
    try {
      await completeEscrow(escrow);
    } catch (e: any) {
      toast.error(e.message || 'Failed to release escrow');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefundEscrow = async () => {
    if (!selectedEscrow) return;
    setActionLoading(selectedEscrow.purchase_commitment);
    try {
      const reasonHash = computeReasonHash(refundReason || 'General return');
      await refundEscrow(selectedEscrow, reasonHash);
      setRefundModalOpen(false);
      setRefundReason('');
      setSelectedEscrow(null);
    } catch (e: any) {
      toast.error(e.message || 'Failed to request refund');
    } finally {
      setActionLoading(null);
    }
  };

  // Loyalty actions
  const handleClaimLoyalty = async (receipt: BuyerReceiptRecord) => {
    setActionLoading(receipt.purchase_commitment);
    try {
      if (stamps.length === 0) {
        await claimLoyalty(receipt);
      } else {
        await mergeLoyalty(receipt, stamps[0]);
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to claim loyalty');
    } finally {
      setActionLoading(null);
    }
  };

  const handleProveTier = async () => {
    if (!selectedStamp) return;
    setActionLoading('prove');
    try {
      const threshold = parseInt(proveThreshold);
      const verifier = proveVerifier || address || '';
      await proveLoyaltyTier(selectedStamp, threshold, verifier);
      setProveModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to prove tier');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSupportProof = async (receipt: BuyerReceiptRecord) => {
    setActionLoading(`support_${receipt.purchase_commitment}`);
    try {
      const productHash = receipt.cart_commitment;
      await provePurchaseSupport(receipt, productHash);
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate proof');
    } finally {
      setActionLoading(null);
    }
  };

  const formatAmount = (amount: number, tokenType: number) => {
    return tokenType === 1 ? formatUsdcx(amount) : formatCredits(amount);
  };

  const tabItems: { id: TabId; label: string; icon: any; count: number }[] = [
    { id: 'receipts', label: 'Receipts', icon: <ReceiptIcon size={15} />, count: receipts.length },
    { id: 'sales', label: 'Sales', icon: <ShieldIcon size={15} />, count: merchantReceipts.length },
    { id: 'escrow', label: 'Escrow', icon: <ClockIcon size={15} />, count: escrows.length },
    { id: 'loyalty', label: 'Loyalty', icon: <LoyaltyIcon size={15} />, count: stamps.length },
  ];

  // Not connected state
  if (!connected) {
    return (
      <div className="relative min-h-screen pt-24 flex items-center justify-center">
        <GridBackground className="opacity-20" />
        <GlowOrb color="sky" size={300} className="top-1/3 left-1/2 -translate-x-1/2" />
        <div className="relative z-10">
          <EmptyState
            icon={<ShieldIcon size={52} className="text-white/20" />}
            title="Connect Wallet"
            description="Connect your Aleo wallet to view your private receipts and manage escrow."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pt-24 pb-16">
      {/* Background effects */}
      <GridBackground className="opacity-20" />
      <FloatingParticles count={25} />
      <div className="absolute top-20 right-0 w-[500px] h-[400px] bg-purple-500/[0.03] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-sky-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <SectionHeader
            title="My Receipts"
            subtitle="On-chain receipts, escrow protection, and loyalty stamps"
            action={
              <Button
                variant="secondary"
                icon={<RefreshIcon size={16} />}
                loading={loadingRecords}
                onClick={loadRecords}
              >
                Refresh
              </Button>
            }
          />
        </motion.div>

        {/* Transaction Activity */}
        {displayedTxs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className={displayedTxs.some(t => t.status === 'pending') ? 'border-amber-500/20' : 'border-white/[0.08]'}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {displayedTxs.some(t => t.status === 'pending')
                    ? <PulseIndicator color="bg-amber-400" />
                    : <span className="w-3 h-3 rounded-full bg-emerald-400 flex-shrink-0" />
                  }
                  <span className={`font-medium text-sm ${displayedTxs.some(t => t.status === 'pending') ? 'text-amber-300' : 'text-emerald-300'}`}>
                    {displayedTxs.some(t => t.status === 'pending') ? 'Pending Transactions' : 'Recent Transactions'}
                  </span>
                </div>
                <button
                  onClick={() => usePendingTxStore.getState().clearCompleted()}
                  className="text-[11px] text-white/20 hover:text-white/50 transition-colors"
                >
                  Clear done
                </button>
              </div>
              <div className="space-y-2">
                {displayedTxs.map((tx) => {
                  const network = import.meta.env.VITE_ALEO_NETWORK || 'testnet';
                  const explorerUrl = `https://${network}.explorer.provable.com/transaction/${tx.txId}`;
                  const shortId = `${tx.txId.slice(0, 14)}...${tx.txId.slice(-8)}`;
                  return (
                    <div key={tx.txId} className={`flex items-center justify-between text-sm rounded-lg p-3 border transition-all ${
                      tx.status === 'confirmed'
                        ? 'bg-emerald-500/[0.04] border-emerald-500/10'
                        : tx.status === 'failed'
                        ? 'bg-red-500/[0.04] border-red-500/10'
                        : 'bg-amber-500/[0.04] border-amber-500/10'
                    }`}>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            tx.status === 'confirmed' ? 'bg-emerald-400' :
                            tx.status === 'failed' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'
                          }`} />
                          <span className="text-white/60 font-mono text-[11px] truncate">{shortId}</span>
                          <a
                            href={explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 text-sky-400/70 hover:text-sky-400 transition-colors"
                            title={`View on explorer: ${tx.txId}`}
                          >
                            <ExternalLinkIcon size={11} />
                          </a>
                        </div>
                        {tx.status === 'confirmed' && tx.confirmedAt && (
                          <span className="text-[10px] text-emerald-400/50 pl-3.5">
                            Confirmed {new Date(tx.confirmedAt).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <Badge variant={
                          tx.status === 'confirmed' ? 'success' :
                          tx.status === 'failed' ? 'error' : 'warning'
                        }>
                          {tx.type}
                        </Badge>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                          tx.status === 'confirmed' ? 'text-emerald-400' :
                          tx.status === 'failed' ? 'text-red-400' : 'text-amber-400'
                        }`}>
                          {tx.status === 'confirmed' ? '✓ Done' : tx.status === 'failed' ? '✗ Failed' : '⟳ Pending'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <PillNav tabs={tabItems} active={tab} onChange={setTab} />
        </motion.div>

        {loadingRecords ? (
          <div className="flex justify-center py-24">
            <LoadingSpinner size={40} />
          </div>
        ) : (
          <>
            {/* ========== RECEIPTS TAB ========== */}
            {tab === 'receipts' && (
              <div className="space-y-4">
                {receipts.length === 0 ? (
                  <EmptyState
                    icon={<ReceiptIcon size={52} className="text-white/15" />}
                    title="No Receipts Yet"
                    description="Your private purchase receipts will appear here after shopping."
                  />
                ) : (
                  receipts.map((r, idx) => (
                    <motion.div
                      key={`${r.purchase_commitment}_${idx}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06, duration: 0.4 }}
                    >
                      <Card hover>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2.5 mb-3">
                              <div className="p-1.5 bg-sky-500/10 rounded-lg">
                                <ReceiptIcon size={14} className="text-sky-400" />
                              </div>
                              <span className="text-white font-medium text-sm">Purchase Receipt</span>
                              <Badge variant={r.token_type === 1 ? 'info' : 'purple'} dot>
                                <TokenIcon type={r.token_type as 0|1} size={11} className="inline mr-0.5" />
                                {r.token_type === 1 ? 'USDCx' : 'Credits'}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 mt-4">
                              <div>
                                <span className="text-xs text-white/30 uppercase tracking-wider">Amount</span>
                                <div className="mt-1"><TokenAmount amount={formatAmount(r.total, r.token_type)} type={r.token_type as 0 | 1} size="lg" /></div>
                              </div>
                              <div>
                                <span className="text-xs text-white/30 uppercase tracking-wider">Merchant</span>
                                <p className="text-white/60 font-mono text-xs mt-1">{truncateAddress(r.merchant)}</p>
                              </div>
                              <div>
                                <span className="text-xs text-white/30 uppercase tracking-wider">Date</span>
                                <p className="text-white/60 text-sm mt-1">{r.timestamp ? formatDate(r.timestamp) : 'N/A'}</p>
                              </div>
                            </div>

                            <div className="mt-4 text-xs text-white/15 font-mono">
                              {r.purchase_commitment.slice(0, 24)}...
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleClaimLoyalty(r)}
                              loading={actionLoading === r.purchase_commitment}
                              icon={<LoyaltyIcon size={13} />}
                            >
                              {stamps.length > 0 ? 'Add Stamp' : 'Claim'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSupportProof(r)}
                              loading={actionLoading === `support_${r.purchase_commitment}`}
                              icon={<ShieldIcon size={13} />}
                            >
                              Support
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* ========== SALES TAB (Merchant Receipts) ========== */}
            {tab === 'sales' && (
              <div className="space-y-4">
                {merchantReceipts.length === 0 ? (
                  <EmptyState
                    icon={<ShieldIcon size={52} className="text-white/15" />}
                    title="No Sales Yet"
                    description="When customers buy from you, your private sale receipts will appear here."
                  />
                ) : (
                  <>
                    {/* Sales summary */}
                    <Card glow className="border-emerald-500/15">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-500/10 rounded-xl">
                          <ShieldIcon size={20} className="text-emerald-400" />
                        </div>
                        <span className="text-white font-bold text-lg">Sales Summary</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                        <div>
                          <span className="text-xs text-white/30 uppercase tracking-wider">Total Sales</span>
                          <p className="text-3xl font-bold text-emerald-400 mt-1">{merchantReceipts.length}</p>
                        </div>
                        <div>
                          <span className="text-xs text-white/30 uppercase tracking-wider">Credits Revenue</span>
                          <div className="mt-1"><TokenAmount amount={formatCredits(merchantReceipts.filter(r => r.token_type === 0).reduce((sum, r) => sum + r.total, 0))} type="credits" size="lg" /></div>
                        </div>
                        <div>
                          <span className="text-xs text-white/30 uppercase tracking-wider">USDCx Revenue</span>
                          <div className="mt-1"><TokenAmount amount={formatUsdcx(merchantReceipts.filter(r => r.token_type === 1).reduce((sum, r) => sum + r.total, 0))} type="usdcx" size="lg" /></div>
                        </div>
                      </div>
                    </Card>

                    {merchantReceipts.map((r, idx) => (
                      <motion.div
                        key={`merchant_${r.purchase_commitment}_${idx}`}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.06, duration: 0.4 }}
                      >
                        <Card hover>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2.5 mb-3">
                                <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                                  <ReceiptIcon size={14} className="text-emerald-400" />
                                </div>
                                <span className="text-white font-medium text-sm">Sale Receipt</span>
                                <Badge variant={r.token_type === 1 ? 'info' : 'purple'} dot>
                                  <TokenIcon type={r.token_type as 0|1} size={11} className="inline mr-0.5" />
                                  {r.token_type === 1 ? 'USDCx' : 'Credits'}
                                </Badge>
                                <Badge variant="success" dot>Received</Badge>
                              </div>

                              <div className="grid grid-cols-2 gap-5 mt-4">
                                <div>
                                  <span className="text-xs text-white/30 uppercase tracking-wider">Amount</span>
                                  <div className="mt-1"><TokenAmount amount={formatAmount(r.total, r.token_type)} type={r.token_type as 0 | 1} size="lg" /></div>
                                </div>
                                <div>
                                  <span className="text-xs text-white/30 uppercase tracking-wider">Type</span>
                                  <p className="text-white/60 text-sm mt-1">{r.token_type === 1 ? 'USDCx Stablecoin' : 'Aleo Credits'}</p>
                                </div>
                              </div>

                              <div className="mt-4 text-xs text-white/15 font-mono">
                                {r.purchase_commitment.slice(0, 24)}...
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ========== ESCROW TAB ========== */}
            {tab === 'escrow' && (
              <div className="space-y-4">
                {escrows.length === 0 ? (
                  <EmptyState
                    icon={<ClockIcon size={52} className="text-white/15" />}
                    title="No Active Escrows"
                    description="Your escrow purchases with refund protection will appear here."
                  />
                ) : (
                  escrows.map((e, idx) => (
                    <motion.div
                      key={`${e.purchase_commitment}_${idx}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06, duration: 0.4 }}
                    >
                      <Card hover className="border-amber-500/10">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2.5 mb-3">
                              <div className="p-1.5 bg-amber-500/10 rounded-lg">
                                <ClockIcon size={14} className="text-amber-400" />
                              </div>
                              <span className="text-white font-medium text-sm">Escrow Purchase</span>
                              <Badge variant="warning" dot>Active</Badge>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 mt-4">
                              <div>
                                <span className="text-xs text-white/30 uppercase tracking-wider">Locked</span>
                              <div className="mt-1"><TokenAmount amount={formatCredits(e.total)} type="credits" size="lg" /></div>
                              </div>
                              <div>
                                <span className="text-xs text-white/30 uppercase tracking-wider">Merchant</span>
                                <p className="text-white/60 font-mono text-xs mt-1">{truncateAddress(e.merchant)}</p>
                              </div>
                              <div>
                                <span className="text-xs text-white/30 uppercase tracking-wider">Window</span>
                                <p className="text-amber-400 font-medium text-sm mt-1">{ESCROW_RETURN_WINDOW} blocks</p>
                              </div>
                            </div>

                            <div className="mt-4 p-3.5 bg-amber-500/[0.04] border border-amber-500/10 rounded-xl">
                              <p className="text-xs text-amber-300/60 leading-relaxed">
                                Funds are locked on-chain. Release to pay the merchant, or request a refund within the return window ({ESCROW_RETURN_WINDOW} blocks ≈ 8 hours).
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <Button
                              variant="glow"
                              size="sm"
                              onClick={() => handleCompleteEscrow(e)}
                              loading={actionLoading === e.purchase_commitment}
                              icon={<CheckIcon size={13} />}
                            >
                              Release
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                setSelectedEscrow(e);
                                setRefundModalOpen(true);
                              }}
                              icon={<AlertIcon size={13} />}
                            >
                              Refund
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* ========== LOYALTY TAB ========== */}
            {tab === 'loyalty' && (
              <div className="space-y-6">
                {stamps.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card glow className="border-purple-500/15">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div>
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="p-2 bg-purple-500/10 rounded-xl">
                              <LoyaltyIcon size={20} className="text-purple-400" />
                            </div>
                            <span className="text-white font-bold text-lg">Loyalty Score</span>
                          </div>

                          <div className="flex items-baseline gap-6 mt-3">
                            <div>
                              <span className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                                {stamps[0].score}
                              </span>
                              <span className="text-white/30 ml-2 text-sm">stamps</span>
                            </div>
                            <div>
                              <TokenAmount amount={formatCredits(stamps[0].total_spent)} type="credits" size="lg" />
                              <span className="text-white/30 ml-2 text-sm">total spent</span>
                            </div>
                          </div>

                          <div className="mt-5 flex items-center gap-2">
                            {[3, 5, 10].map((tier) => (
                              <Badge
                                key={tier}
                                variant={stamps[0].score >= tier ? 'success' : 'default'}
                                dot
                              >
                                Tier {tier}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <Button
                          variant="secondary"
                          onClick={() => {
                            setSelectedStamp(stamps[0]);
                            setProveModalOpen(true);
                          }}
                          icon={<ShieldIcon size={16} />}
                        >
                          Send Loyalty Badge
                        </Button>
                      </div>

                      <div className="mt-5 p-3.5 bg-purple-500/[0.04] border border-purple-500/10 rounded-xl">
                        <p className="text-xs text-purple-300/50 leading-relaxed">
                          <strong className="text-purple-300/70">What are stamps for?</strong> Each purchase earns you a stamp. Send your loyalty badge to a merchant to unlock rewards — they only see you qualify (≥ N stamps), never your purchase history or spending amounts.
                        </p>
                      </div>
                    </Card>
                  </motion.div>
                )}

                {stamps.length === 0 && (
                  <EmptyState
                    icon={<LoyaltyIcon size={52} className="text-white/15" />}
                    title="No Loyalty Stamps"
                    description="Claim loyalty stamps from your purchase receipts to build your score."
                    action={
                      receipts.length > 0 ? (
                        <Button
                          variant="secondary"
                          onClick={() => setTab('receipts')}
                        >
                          Go to Receipts to Claim
                        </Button>
                      ) : undefined
                    }
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ========== REFUND MODAL ========== */}
      <Modal
        isOpen={refundModalOpen}
        onClose={() => { setRefundModalOpen(false); setSelectedEscrow(null); }}
        title="Request Refund"
      >
        <div className="space-y-5">
          <p className="text-white/40 text-sm leading-relaxed">
            Enter a reason for your refund. The reason will be hashed on-chain — the actual text stays private.
          </p>
          {selectedEscrow && (
            <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              <p className="text-sm text-white/50">
                Amount: <TokenAmount amount={formatCredits(selectedEscrow.total)} type="credits" size="sm" />
              </p>
            </div>
          )}
          <Input
            label="Return Reason"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            placeholder="e.g. Changed my mind, item not as described..."
          />
          <div className="flex gap-3 justify-end pt-1">
            <Button variant="ghost" onClick={() => setRefundModalOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={handleRefundEscrow}
              loading={!!actionLoading}
            >
              Confirm Refund
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========== PROVE TIER MODAL ========== */}
      <Modal
        isOpen={proveModalOpen}
        onClose={() => { setProveModalOpen(false); setSelectedStamp(null); }}
        title="Send Loyalty Badge"
      >
        <div className="space-y-5">
          {/* What is a loyalty badge — VeilReceipt-specific explanation */}
          <div className="p-3.5 bg-purple-500/[0.06] border border-purple-500/15 rounded-xl space-y-2">
            <p className="text-xs font-semibold text-purple-300/80 uppercase tracking-wider">How it works</p>
            <ul className="text-xs text-white/45 space-y-1 leading-relaxed list-none">
              <li>🛍 Every private purchase at a VeilReceipt merchant earns you a stamp</li>
              <li>🔒 Send your badge to a merchant — they confirm you qualify, nothing more</li>
              <li>🎁 Merchants can offer discounts, early drops, or VIP access to badge holders</li>
              <li>👁 Your purchase history and exact stamp count stay completely private</li>
            </ul>
          </div>

          {selectedStamp && (
            <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              <p className="text-sm text-white/50">
                Your stamps: <strong className="text-purple-400 font-semibold">{selectedStamp.score}</strong>
                <span className="text-white/25 ml-2 text-xs">The recipient only sees whether you meet the minimum — not this number</span>
              </p>
            </div>
          )}
          <Input
            label="Minimum stamps required (badge threshold)"
            type="number"
            value={proveThreshold}
            onChange={(e) => setProveThreshold(e.target.value)}
            placeholder="e.g. 3"
          />
          <Input
            label="Merchant or recipient address"
            value={proveVerifier}
            onChange={(e) => setProveVerifier(e.target.value)}
            placeholder="aleo1... (the merchant who will verify your badge)"
          />
          <div className="flex gap-3 justify-end pt-1">
            <Button variant="ghost" onClick={() => setProveModalOpen(false)}>Cancel</Button>
            <Button
              variant="glow"
              onClick={handleProveTier}
              loading={actionLoading === 'prove'}
              icon={<ShieldIcon size={16} />}
            >
              Send Badge
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Receipts;
