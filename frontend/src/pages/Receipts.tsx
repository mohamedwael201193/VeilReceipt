// Receipts Page — On-chain receipts, escrow, and support proofs

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
  RefreshIcon,
  CheckIcon,
  AlertIcon,
  ExternalLinkIcon,
  FileIcon,
} from '@/components/icons/Icons';
import { GridBackground } from '@/components/effects/CosmicBackground';
import { truncateAddress, formatDate, computeReasonHash } from '@/lib/utils';
import { formatCredits, formatUsdcx, formatUsad } from '@/lib/stablecoin';
import { ESCROW_RETURN_WINDOW } from '@/lib/chain';
import { getCurrentBlockHeight } from '@/lib/aleoNetwork';
import { usePendingTxStore } from '@/stores/txStore';
import type { BuyerReceiptRecord, MerchantReceiptRecord, EscrowReceiptRecord } from '@/lib/types';

type TabId = 'receipts' | 'sales' | 'escrow';

const Receipts: FC = () => {
  const {
    connected,
    getBuyerReceipts, getMerchantReceipts, getEscrowReceipts,
    completeEscrow, refundEscrow,
    provePurchaseSupport,
  } = useVeilWallet();

  const [tab, setTab] = useState<TabId>('receipts');
  const [receipts, setReceipts] = useState<BuyerReceiptRecord[]>([]);
  const [merchantReceipts, setMerchantReceipts] = useState<MerchantReceiptRecord[]>([]);
  const [escrows, setEscrows] = useState<EscrowReceiptRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Refund modal
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundBlockHeight, setRefundBlockHeight] = useState('');
  const [selectedEscrow, setSelectedEscrow] = useState<EscrowReceiptRecord | null>(null);
  const [currentBlock, setCurrentBlock] = useState(0);

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
      const [r, mr, e, height] = await Promise.all([
        getBuyerReceipts(),
        getMerchantReceipts(),
        getEscrowReceipts(),
        getCurrentBlockHeight(),
      ]);
      setReceipts(r);
      setMerchantReceipts(mr);
      setEscrows(e);
      setCurrentBlock(height);
    } catch (err) {
      console.error('Failed to load records:', err);
      toast.error('Failed to load on-chain records');
    } finally {
      setLoadingRecords(false);
    }
  }, [connected, getBuyerReceipts, getMerchantReceipts, getEscrowReceipts]);

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
    const blockNum = parseInt(refundBlockHeight, 10);
    if (!blockNum || blockNum <= 0) {
      toast.error('Please enter the block height when the escrow was created');
      return;
    }
    setActionLoading(selectedEscrow.purchase_commitment);
    try {
      const reasonHash = computeReasonHash(refundReason || 'General return');
      await refundEscrow(selectedEscrow, reasonHash, blockNum);
      setRefundModalOpen(false);
      setRefundReason('');
      setRefundBlockHeight('');
      setSelectedEscrow(null);
    } catch (e: any) {
      toast.error(e.message || 'Failed to request refund');
    } finally {
      setActionLoading(null);
    }
  };

  const [provenReceipts, setProvenReceipts] = useState<Set<string>>(new Set());

  const handleSupportProof = async (receipt: BuyerReceiptRecord) => {
    const key = `support_${receipt.purchase_commitment}`;
    setActionLoading(key);
    try {
      const productHash = receipt.cart_commitment;
      const txId = await provePurchaseSupport(receipt, productHash);
      // Mark as proven permanently (until page navigation)
      setProvenReceipts(prev => new Set(prev).add(receipt.purchase_commitment));
      toast.success(
        `Support proof generated! TX: ${txId?.slice(0, 16)}...`,
        { duration: 6000 }
      );
    } catch (e: any) {
      console.error('Support proof error:', e);
      toast.error(e.message || 'Failed to generate proof');
    } finally {
      setActionLoading(null);
    }
  };

  const formatAmount = (amount: number, tokenType: number) => {
    return tokenType === 1 ? formatUsdcx(amount) : tokenType === 2 ? formatUsad(amount) : formatCredits(amount);
  };

  const exportReceipt = (receipt: BuyerReceiptRecord) => {
    const data = {
      type: 'VeilReceipt',
      version: 'v7',
      purchase_commitment: receipt.purchase_commitment,
      merchant: receipt.merchant,
      total: receipt.total,
      token_type: receipt.token_type === 0 ? 'credits' : 'usdcx',
      cart_commitment: receipt.cart_commitment,
      timestamp: receipt.timestamp,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veilreceipt_${receipt.purchase_commitment.slice(0, 12)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Receipt exported!');
  };

  const tabItems: { id: TabId; label: string; icon: any; count: number }[] = [
    { id: 'receipts', label: 'Receipts', icon: <ReceiptIcon size={15} />, count: receipts.length },
    { id: 'sales', label: 'Sales', icon: <ShieldIcon size={15} />, count: merchantReceipts.length },
    { id: 'escrow', label: 'Escrow', icon: <ClockIcon size={15} />, count: escrows.length },
  ];

  // Not connected state
  if (!connected) {
    return (
      <div className="relative min-h-screen pt-24 flex items-center justify-center">
        <GridBackground className="opacity-20" />
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
      {/* Background */}
      <GridBackground className="opacity-20" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <SectionHeader
            title="My Receipts"
            subtitle="On-chain receipts, escrow protection, and purchase history"
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
                            className="flex-shrink-0 text-green-400/70 hover:text-green-400 transition-colors"
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
                              <div className="p-1.5 bg-green-500/10 rounded-lg">
                                <ReceiptIcon size={14} className="text-green-400" />
                              </div>
                              <span className="text-white font-medium text-sm">Purchase Receipt</span>
                              <Badge variant={r.token_type === 1 ? 'info' : r.token_type === 2 ? 'warning' : 'purple'} dot>
                                <TokenIcon type={r.token_type as 0|1|2} size={11} className="inline mr-0.5" />
                                {r.token_type === 1 ? 'USDCx' : r.token_type === 2 ? 'USAD' : 'Credits'}
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
                            {provenReceipts.has(r.purchase_commitment) ? (
                              <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg"
                              >
                                <CheckIcon size={13} className="text-green-400" />
                                <span className="text-xs text-green-400 font-medium">Proof Sent</span>
                              </motion.div>
                            ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSupportProof(r)}
                              loading={actionLoading === `support_${r.purchase_commitment}`}
                              icon={<ShieldIcon size={13} />}
                            >
                              Support Proof
                            </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => exportReceipt(r)}
                              icon={<FileIcon size={13} />}
                            >
                              Export
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
                        <div>
                          <span className="text-xs text-white/30 uppercase tracking-wider">USAD Revenue</span>
                          <div className="mt-1"><TokenAmount amount={formatUsad(merchantReceipts.filter(r => r.token_type === 2).reduce((sum, r) => sum + r.total, 0))} type="usad" size="lg" /></div>
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
                                {currentBlock > 0 && (
                                  <p className="text-xs text-white/30 mt-0.5">Current block: {currentBlock.toLocaleString()}</p>
                                )}
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
          <Input
            label="Escrow Creation Block Height"
            value={refundBlockHeight}
            onChange={(e) => setRefundBlockHeight(e.target.value.replace(/\D/g, ''))}
            placeholder="Block height when escrow was created"
          />
          {currentBlock > 0 && (
            <p className="text-xs text-white/30">
              Current block: {currentBlock.toLocaleString()}. Refund window: {ESCROW_RETURN_WINDOW} blocks from creation.
            </p>
          )}
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

    </div>
  );
};

export default Receipts;
