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
  CopyIcon,
} from '@/components/icons/Icons';
import { truncateAddress, formatDate, computeReasonHash, copyToClipboard } from '@/lib/utils';
import { formatCredits, formatUsdcx, formatUsad } from '@/lib/stablecoin';
import { ESCROW_RETURN_WINDOW } from '@/lib/chain';
import { getCurrentBlockHeight, getTransactionBlockHeight } from '@/lib/aleoNetwork';
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
  const [escrowBlockMap, setEscrowBlockMap] = useState<Record<string, number>>({});

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

      // Resolve escrow block heights from localStorage + pending TX store
      if (e.length > 0) {
        const stored = JSON.parse(localStorage.getItem('veil_escrow_blocks') || '{}');
        const missing = e.filter(esc => !stored[esc.purchase_commitment]);
        if (missing.length > 0) {
          // Try to find escrow TXs in pending store and look up their block heights
          const escrowTxs = usePendingTxStore.getState().transactions.filter(
            tx => tx.type === 'escrow' && tx.txId.startsWith('at1') && tx.status === 'confirmed'
          );
          for (const tx of escrowTxs) {
            // Skip if we already resolved block height for all missing
            if (missing.every(m => stored[m.purchase_commitment])) break;
            // Check if we have a cached block height for this TX
            const cachedBlock = localStorage.getItem(`escrow_block_${tx.txId}`);
            if (cachedBlock) {
              // Assign to any missing escrow that doesn't have a block yet
              for (const m of missing) {
                if (!stored[m.purchase_commitment]) {
                  stored[m.purchase_commitment] = Number(cachedBlock);
                  break; // one TX -> one escrow
                }
              }
              continue;
            }
            // Fetch from API
            try {
              const blockH = await getTransactionBlockHeight(tx.txId);
              if (blockH) {
                localStorage.setItem(`escrow_block_${tx.txId}`, String(blockH));
                for (const m of missing) {
                  if (!stored[m.purchase_commitment]) {
                    stored[m.purchase_commitment] = blockH;
                    break;
                  }
                }
              }
            } catch { /* non-critical */ }
          }
          localStorage.setItem('veil_escrow_blocks', JSON.stringify(stored));
        }
        setEscrowBlockMap(stored);
      }
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

  const [provenReceipts, setProvenReceipts] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('veil_proven_receipts');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [supportProofData, setSupportProofData] = useState<any>(null);
  const [supportProofModalOpen, setSupportProofModalOpen] = useState(false);
  const [copiedProof, setCopiedProof] = useState(false);

  const markProven = (commitment: string, proofData?: any) => {
    setProvenReceipts(prev => {
      const next = new Set(prev).add(commitment);
      localStorage.setItem('veil_proven_receipts', JSON.stringify([...next]));
      return next;
    });
    if (proofData) {
      const stored = JSON.parse(localStorage.getItem('veil_proof_data') || '{}');
      stored[commitment] = proofData;
      localStorage.setItem('veil_proof_data', JSON.stringify(stored));
    }
  };

  const getStoredProofCode = (commitment: string): string | null => {
    try {
      const stored = JSON.parse(localStorage.getItem('veil_proof_data') || '{}');
      if (stored[commitment]) return btoa(JSON.stringify(stored[commitment]));
      return null;
    } catch { return null; }
  };

  const [copiedReceipt, setCopiedReceipt] = useState<string | null>(null);

  const handleCopyStoredProof = async (commitment: string) => {
    const code = getStoredProofCode(commitment);
    if (code) {
      const ok = await copyToClipboard(code);
      if (ok) {
        setCopiedReceipt(commitment);
        toast.success('Proof code copied!');
        setTimeout(() => setCopiedReceipt(null), 3000);
      }
    }
  };

  const handleSupportProof = async (receipt: BuyerReceiptRecord) => {
    const key = `support_${receipt.purchase_commitment}`;
    setActionLoading(key);
    try {
      const productHash = receipt.cart_commitment;
      const result = await provePurchaseSupport(receipt, productHash);
      markProven(receipt.purchase_commitment, result?.proofData);
      if (result?.proofData) {
        setSupportProofData(result.proofData);
        setSupportProofModalOpen(true);
      }
    } catch (e: any) {
      console.error('Support proof error:', e);
      toast.error(e.message || 'Failed to generate proof');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyProofCode = async () => {
    if (!supportProofData) return;
    const proofCode = btoa(JSON.stringify(supportProofData));
    const ok = await copyToClipboard(proofCode);
    if (ok) {
      setCopiedProof(true);
      toast.success('Proof code copied! Share it with the merchant to verify your purchase.');
      setTimeout(() => setCopiedProof(false), 3000);
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
      token_type: receipt.token_type === 0 ? 'credits' : receipt.token_type === 1 ? 'usdcx' : 'usad',
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
      <div className="relative min-h-screen pt-4 flex items-center justify-center">
        <div className="relative z-10">
          <EmptyState
            icon={<ShieldIcon size={52} className="text-[#c9c6c5]/25" />}
            title="Connect Wallet"
            description="Connect your Aleo wallet to view your private receipts and manage escrow."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pt-4 pb-16">
      {/* Background */}

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
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
            <Card className={displayedTxs.some(t => t.status === 'pending') ? 'border-amber-500/20' : 'border-[#d4bbff]/15'} beam={displayedTxs.some(t => t.status === 'pending')} beamColor={{ from: '#f59e0b', to: '#7dffa2' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {displayedTxs.some(t => t.status === 'pending')
                    ? <PulseIndicator color="bg-amber-400" />
                    : <span className="w-3 h-3 rounded-full bg-[#7dffa2] flex-shrink-0" />
                  }
                  <span className={`font-medium text-sm ${displayedTxs.some(t => t.status === 'pending') ? 'text-amber-300' : 'text-emerald-300'}`}>
                    {displayedTxs.some(t => t.status === 'pending') ? 'Pending Transactions' : 'Recent Transactions'}
                  </span>
                </div>
                <button
                  onClick={() => usePendingTxStore.getState().clearCompleted()}
                  className="text-[11px] text-[#c9c6c5]/25 hover:text-[#c9c6c5]/70 transition-colors"
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
                        ? 'bg-[#7dffa2]/5 border-[#7dffa2]/10'
                        : tx.status === 'failed'
                        ? 'bg-red-500/[0.04] border-[#ffb4ab]/10'
                        : 'bg-amber-500/[0.04] border-amber-500/10'
                    }`}>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            tx.status === 'confirmed' ? 'bg-[#7dffa2]' :
                            tx.status === 'failed' ? 'bg-[#ffb4ab]' : 'bg-amber-400 animate-pulse'
                          }`} />
                          <span className="text-[#c9c6c5]/80 font-mono text-[11px] truncate">{shortId}</span>
                          <a
                            href={explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 text-[#7dffa2]/70 hover:text-[#7dffa2] transition-colors"
                            title={`View on explorer: ${tx.txId}`}
                          >
                            <ExternalLinkIcon size={11} />
                          </a>
                        </div>
                        {tx.status === 'confirmed' && tx.confirmedAt && (
                          <span className="text-[10px] text-[#7dffa2]/50 pl-3.5">
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
                          tx.status === 'confirmed' ? 'text-[#7dffa2]' :
                          tx.status === 'failed' ? 'text-[#ffb4ab]' : 'text-amber-400'
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
                      initial={{ opacity: 0, y: 20, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: idx * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                      <Card hover>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2.5 mb-3">
                              <div className="p-1.5 bg-[#7dffa2]/10 rounded-lg">
                                <ReceiptIcon size={14} className="text-[#7dffa2]" />
                              </div>
                              <span className="text-[#e5e2e1] font-medium text-sm">Purchase Receipt</span>
                              <Badge variant={r.token_type === 1 ? 'info' : r.token_type === 2 ? 'warning' : 'purple'} dot>
                                <TokenIcon type={r.token_type as 0|1|2} size={11} className="inline mr-0.5" />
                                {r.token_type === 1 ? 'USDCx' : r.token_type === 2 ? 'USAD' : 'Credits'}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 mt-4">
                              <div>
                                <span className="text-xs text-[#c9c6c5]/40 uppercase tracking-wider">Amount</span>
                                <div className="mt-1"><TokenAmount amount={formatAmount(r.total, r.token_type)} type={r.token_type as 0 | 1 | 2} size="lg" /></div>
                              </div>
                              <div>
                                <span className="text-xs text-[#c9c6c5]/40 uppercase tracking-wider">Merchant</span>
                                <p className="text-[#c9c6c5]/80 font-mono text-xs mt-1">{truncateAddress(r.merchant)}</p>
                              </div>
                              <div>
                                <span className="text-xs text-[#c9c6c5]/40 uppercase tracking-wider">Date</span>
                                <p className="text-[#c9c6c5]/80 text-sm mt-1">{r.timestamp ? formatDate(r.timestamp) : 'N/A'}</p>
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
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7dffa2]/10 border border-[#7dffa2]/20 rounded-lg"
                              >
                                <CheckIcon size={13} className="text-[#7dffa2]" />
                                <span className="text-xs text-[#7dffa2] font-medium">Proof Sent</span>
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
                            {provenReceipts.has(r.purchase_commitment) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const code = getStoredProofCode(r.purchase_commitment);
                                  if (code) {
                                    handleCopyStoredProof(r.purchase_commitment);
                                  } else {
                                    handleSupportProof(r);
                                  }
                                }}
                                loading={actionLoading === `support_${r.purchase_commitment}`}
                                icon={copiedReceipt === r.purchase_commitment ? <CheckIcon size={13} className="text-[#7dffa2]" /> : <CopyIcon size={13} />}
                              >
                                {copiedReceipt === r.purchase_commitment ? 'Copied!' : getStoredProofCode(r.purchase_commitment) ? 'Copy Code' : 'Get Code'}
                              </Button>
                            )}
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
                    <Card glow className="border-[#7dffa2]/15" beam beamColor={{ from: '#7dffa2', to: '#d4bbff' }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-[#7dffa2]/10 rounded-xl">
                          <ShieldIcon size={20} className="text-[#7dffa2]" />
                        </div>
                        <span className="text-[#e5e2e1] font-bold text-lg">Sales Summary</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                        <div>
                          <span className="text-xs text-[#c9c6c5]/40 uppercase tracking-wider">Total Sales</span>
                          <p className="text-3xl font-bold text-[#7dffa2] mt-1">{merchantReceipts.length}</p>
                        </div>
                        <div>
                          <span className="text-xs text-[#c9c6c5]/40 uppercase tracking-wider">Credits Revenue</span>
                          <div className="mt-1"><TokenAmount amount={formatCredits(merchantReceipts.filter(r => r.token_type === 0).reduce((sum, r) => sum + r.total, 0))} type="credits" size="lg" /></div>
                        </div>
                        <div>
                          <span className="text-xs text-[#c9c6c5]/40 uppercase tracking-wider">USDCx Revenue</span>
                          <div className="mt-1"><TokenAmount amount={formatUsdcx(merchantReceipts.filter(r => r.token_type === 1).reduce((sum, r) => sum + r.total, 0))} type="usdcx" size="lg" /></div>
                        </div>
                        <div>
                          <span className="text-xs text-[#c9c6c5]/40 uppercase tracking-wider">USAD Revenue</span>
                          <div className="mt-1"><TokenAmount amount={formatUsad(merchantReceipts.filter(r => r.token_type === 2).reduce((sum, r) => sum + r.total, 0))} type="usad" size="lg" /></div>
                        </div>
                      </div>
                    </Card>

                    {merchantReceipts.map((r, idx) => (
                      <motion.div
                        key={`merchant_${r.purchase_commitment}_${idx}`}
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: idx * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                      >
                        <Card hover>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2.5 mb-3">
                                <div className="p-1.5 bg-[#7dffa2]/10 rounded-lg">
                                  <ReceiptIcon size={14} className="text-[#7dffa2]" />
                                </div>
                                <span className="text-[#e5e2e1] font-medium text-sm">Sale Receipt</span>
                                <Badge variant={r.token_type === 1 ? 'info' : r.token_type === 2 ? 'warning' : 'purple'} dot>
                                  <TokenIcon type={r.token_type as 0|1|2} size={11} className="inline mr-0.5" />
                                  {r.token_type === 1 ? 'USDCx' : r.token_type === 2 ? 'USAD' : 'Credits'}
                                </Badge>
                                <Badge variant="success" dot>Received</Badge>
                              </div>

                              <div className="grid grid-cols-2 gap-5 mt-4">
                                <div>
                                  <span className="text-xs text-[#c9c6c5]/40 uppercase tracking-wider">Amount</span>
                                  <div className="mt-1"><TokenAmount amount={formatAmount(r.total, r.token_type)} type={r.token_type as 0 | 1 | 2} size="lg" /></div>
                                </div>
                                <div>
                                  <span className="text-xs text-[#c9c6c5]/40 uppercase tracking-wider">Type</span>
                                  <p className="text-[#c9c6c5]/80 text-sm mt-1">{r.token_type === 1 ? 'USDCx Stablecoin' : r.token_type === 2 ? 'USAD Stablecoin' : 'Aleo Credits'}</p>
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
                              <span className="text-[#e5e2e1] font-medium text-sm">Escrow Purchase</span>
                              <Badge variant="warning" dot>Active</Badge>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 mt-4">
                              <div>
                                <span className="text-xs text-[#c9c6c5]/40 uppercase tracking-wider">Locked</span>
                              <div className="mt-1"><TokenAmount amount={formatCredits(e.total)} type="credits" size="lg" /></div>
                              </div>
                              <div>
                                <span className="text-xs text-[#c9c6c5]/40 uppercase tracking-wider">Merchant</span>
                                <p className="text-[#c9c6c5]/80 font-mono text-xs mt-1">{truncateAddress(e.merchant)}</p>
                              </div>
                              <div>
                                <span className="text-xs text-[#c9c6c5]/40 uppercase tracking-wider">Window</span>
                                <p className="text-amber-400 font-medium text-sm mt-1">{ESCROW_RETURN_WINDOW} blocks</p>
                                {escrowBlockMap[e.purchase_commitment] ? (
                                  <p className="text-xs text-[#7dffa2]/60 mt-0.5">Created: {escrowBlockMap[e.purchase_commitment].toLocaleString()}</p>
                                ) : currentBlock > 0 ? (
                                  <p className="text-xs text-[#c9c6c5]/40 mt-0.5">Current: {currentBlock.toLocaleString()}</p>
                                ) : null}
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
                                // Auto-fill block height from resolved map
                                const block = escrowBlockMap[e.purchase_commitment];
                                setRefundBlockHeight(block ? String(block) : '');
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
          <p className="text-[#c9c6c5]/60 text-sm leading-relaxed">
            Enter a reason for your refund. The reason will be hashed on-chain — the actual text stays private.
          </p>
          {selectedEscrow && (
            <div className="p-4 bg-[#1c1b1b]/40 border border-[#d4bbff]/10 rounded-xl">
              <p className="text-sm text-[#c9c6c5]/70">
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
            placeholder="Auto-filled from your purchase"
            disabled={!!refundBlockHeight}
          />
          {refundBlockHeight ? (
            <p className="text-xs text-[#7dffa2]/60">
              Block height auto-filled from your escrow purchase record.
            </p>
          ) : (
            <p className="text-xs text-amber-400/60">
              Could not auto-detect. Enter the block height when the escrow was created (check your transaction history).
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

      {/* Support Proof Result Modal */}
      <Modal
        isOpen={supportProofModalOpen}
        onClose={() => { setSupportProofModalOpen(false); setSupportProofData(null); setCopiedProof(false); }}
        title="Support Proof Generated"
      >
        {supportProofData && (
          <div className="space-y-5">
            <div className="p-3.5 bg-[#7dffa2]/[0.06] border border-[#7dffa2]/15 rounded-xl">
              <p className="text-xs font-semibold text-[#7dffa2]/80 uppercase tracking-wider mb-2">Proof Ready</p>
              <p className="text-xs text-white/45 leading-relaxed">
                Your support proof has been submitted on-chain. Copy the proof code below and
                share it with the merchant — they can paste it on the Verify page to confirm your purchase.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs text-[#c9c6c5]/40 uppercase tracking-wider">Purchase Commitment</span>
                <p className="text-xs text-[#c9c6c5]/80 font-mono mt-0.5 break-all">{supportProofData.purchase_commitment}</p>
              </div>
              <div>
                <span className="text-xs text-[#c9c6c5]/40 uppercase tracking-wider">Product Hash</span>
                <p className="text-xs text-[#c9c6c5]/80 font-mono mt-0.5 break-all">{supportProofData.product_hash}</p>
              </div>
              <div>
                <span className="text-xs text-[#c9c6c5]/40 uppercase tracking-wider">Salt</span>
                <p className="text-xs text-[#c9c6c5]/80 font-mono mt-0.5 break-all">{supportProofData.salt}</p>
              </div>
              <div>
                <span className="text-xs text-[#c9c6c5]/40 uppercase tracking-wider">Merchant</span>
                <p className="text-xs text-[#c9c6c5]/80 font-mono mt-0.5 break-all">{supportProofData.merchant}</p>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-1">
              <Button variant="ghost" onClick={() => { setSupportProofModalOpen(false); setSupportProofData(null); setCopiedProof(false); }}>Close</Button>
              <Button
                variant="glow"
                onClick={handleCopyProofCode}
                icon={copiedProof ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
              >
                {copiedProof ? 'Copied!' : 'Copy Proof Code'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default Receipts;
