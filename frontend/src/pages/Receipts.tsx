// Receipts page - View receipts, process returns, claim loyalty, generate support tokens

import { FC, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVeilWallet } from '@/hooks/useVeilWallet';
import { api } from '@/lib/api';
import { formatCredits, formatDate, truncateAddress, computeReasonHash, copyToClipboard } from '@/lib/utils';
import { TransactionStatus, LOYALTY_TIERS, RETURN_REASONS } from '@/lib/types';
import {
  ReceiptIcon,
  ReturnIcon,
  LoyaltyIcon,
  ShieldIcon,
  LoadingSpinner,
  SuccessCheck,
  ErrorX,
  RefreshIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  AwardIcon,
  FileIcon,
} from '@/components/icons/Icons';
import { Button, Card, Badge, EmptyState, Modal, Select } from '@/components/ui/Components';
import toast from 'react-hot-toast';

const ReceiptsPage: FC = () => {
  const { 
    connected, 
    address, 
    isAuthenticated, 
    authenticate, 
    isAuthenticating,
    receipts,
    isLoadingReceipts,
    fetchReceipts,
    executeReturn,
    executeLoyaltyClaim,
    generateSupportProof,
  } = useVeilWallet();

  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<TransactionStatus>('idle');
  
  // Modal states
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  
  // Form states
  const [returnReason, setReturnReason] = useState('');
  const [loyaltyTier, setLoyaltyTier] = useState(1);
  const [proofToken, setProofToken] = useState<string | null>(null);
  
  // Track if we've already fetched receipts this session
  const [hasFetched, setHasFetched] = useState(false);

  // Only fetch receipts once when authenticated (not on every render)
  useEffect(() => {
    // Only auto-fetch if authenticated AND haven't fetched yet
    if (connected && isAuthenticated && !hasFetched && !isLoadingReceipts) {
      setHasFetched(true);
      // Use a small delay to prevent race conditions
      const timer = setTimeout(() => {
        fetchReceipts(true); // Force fetch
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [connected, isAuthenticated, hasFetched, isLoadingReceipts, fetchReceipts]);

  // Reset hasFetched when disconnected
  useEffect(() => {
    if (!connected || !isAuthenticated) {
      setHasFetched(false);
    }
  }, [connected, isAuthenticated]);

  const handleAuth = async () => {
    await authenticate('buyer');
    // After auth, set hasFetched to false so useEffect will trigger fetch
    setHasFetched(false);
  };

  // Manual refresh - force fetch
  const handleRefresh = () => {
    fetchReceipts(true); // Force fetch with true parameter
  };

  // Open Return
  const handleOpenReturn = (receipt: any) => {
    setSelectedReceipt(receipt);
    setReturnReason('');
    setShowReturnModal(true);
  };

  const handleSubmitReturn = async () => {
    if (!selectedReceipt || !returnReason) {
      toast.error('Please select a return reason');
      return;
    }

    setShowReturnModal(false);
    setShowTxModal(true);
    setTxStatus('signing');

    try {
      const reasonHash = computeReasonHash(returnReason);
      // Pass the full receipt object (not just _raw) so the hook can check _fromWallet
      const txId = await executeReturn(selectedReceipt, reasonHash);

      if (!txId) {
        setTxStatus('failed');
        return;
      }

      setTxStatus('pending');

      // Record in backend
      try {
        await api.recordTransaction({
          txId: txId as any,
          type: 'return',
          merchantAddress: selectedReceipt.merchant as any,
          buyerAddress: address as any,
          nullifier: reasonHash as any, // Simplified - real nullifier comes from contract
          reason: returnReason,
          totalAmount: Number(selectedReceipt.total),
        });
      } catch (e) {
        console.warn('Failed to record return metadata:', e);
      }

      // Simulate confirmation
      setTimeout(() => {
        setTxStatus('confirmed');
        toast.success('Return processed!');
        fetchReceipts(); // Refresh to show consumed receipt
      }, 3000);

    } catch (error: any) {
      setTxStatus('failed');
      if (error.message?.includes('nullifier')) {
        toast.error('This receipt has already been returned');
      } else {
        toast.error(error.message || 'Return failed');
      }
    }
  };

  // Claim Loyalty
  const handleOpenLoyalty = (receipt: any) => {
    setSelectedReceipt(receipt);
    setLoyaltyTier(1);
    setShowLoyaltyModal(true);
  };

  const handleSubmitLoyalty = async () => {
    if (!selectedReceipt) return;

    setShowLoyaltyModal(false);
    setShowTxModal(true);
    setTxStatus('signing');

    try {
      // Pass the full receipt object (not just _raw) so the hook can check _fromWallet
      const txId = await executeLoyaltyClaim(selectedReceipt, loyaltyTier);

      if (!txId) {
        setTxStatus('failed');
        return;
      }

      setTxStatus('pending');

      // Record in backend
      try {
        await api.recordTransaction({
          txId: txId as any,
          type: 'loyalty',
          merchantAddress: selectedReceipt.merchant as any,
          buyerAddress: address as any,
          nullifier: selectedReceipt.nonce_seed as any, // Simplified
          tier: loyaltyTier,
        });
      } catch (e) {
        console.warn('Failed to record loyalty metadata:', e);
      }

      setTimeout(() => {
        setTxStatus('confirmed');
        toast.success(`${LOYALTY_TIERS[loyaltyTier as keyof typeof LOYALTY_TIERS].name} tier claimed!`);
        fetchReceipts();
      }, 3000);

    } catch (error: any) {
      setTxStatus('failed');
      if (error.message?.includes('nullifier')) {
        toast.error('Loyalty already claimed for this receipt');
      } else {
        toast.error(error.message || 'Claim failed');
      }
    }
  };

  // Support Proof
  const handleOpenProof = (receipt: any) => {
    setSelectedReceipt(receipt);
    setProofToken(null);
    setShowProofModal(true);
  };

  const handleGenerateProof = async () => {
    if (!selectedReceipt) return;

    setTxStatus('signing');

    try {
      // Generate random salt
      const salt = `${Math.floor(Math.random() * 1000000000)}field`;
      const productHash = selectedReceipt.cart_commitment;

      // Pass the full receipt object (not just _raw) so the hook can check _fromWallet
      const txId = await generateSupportProof(selectedReceipt, productHash, salt);

      if (txId) {
        // In real implementation, parse the output from transaction
        // For now, simulate a proof token
        setProofToken(`proof_${Date.now()}_${Math.random().toString(36).slice(2)}`);
        setTxStatus('idle');
        toast.success('Proof token generated!');
      } else {
        toast.error('Failed to generate proof');
      }

    } catch (error: any) {
      toast.error(error.message || 'Proof generation failed');
    } finally {
      setTxStatus('idle');
    }
  };

  const copyProofToken = async () => {
    if (proofToken) {
      const success = await copyToClipboard(proofToken);
      if (success) {
        toast.success('Copied to clipboard!');
      }
    }
  };

  // Not connected
  if (!connected) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-2xl mx-auto">
          <EmptyState
            icon={<ReceiptIcon size={48} />}
            title="Connect Your Wallet"
            description="Connect your wallet to view your private receipts"
          />
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <ReceiptIcon size={64} className="text-veil-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-white mb-4">Your Receipts</h1>
            <p className="text-slate-400 mb-8">
              Authenticate to view and manage your private receipts
            </p>
            <Button onClick={handleAuth} loading={isAuthenticating} size="lg">
              Authenticate
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <ReceiptIcon size={32} className="text-veil-400" />
              My Receipts
            </h1>
            <p className="text-slate-400 mt-1">
              View receipts, process returns, and claim loyalty rewards
            </p>
          </div>
          <Button variant="ghost" onClick={handleRefresh} disabled={isLoadingReceipts}>
            <RefreshIcon size={18} className={isLoadingReceipts ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>

        {/* Privacy Notice */}
        <Card className="mb-8 bg-veil-900/30 border-veil-700/50">
          <div className="flex items-start gap-3">
            <ShieldIcon size={24} className="text-veil-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-white mb-1">Privacy Protected</h3>
              <p className="text-sm text-slate-300">
                Your receipts are encrypted on-chain. Only you can view the details.
                Returns and loyalty use nullifiers to prevent double-claims without revealing your identity.
              </p>
            </div>
          </div>
        </Card>

        {/* Receipts List */}
        {isLoadingReceipts ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size={32} />
          </div>
        ) : receipts.length === 0 ? (
          <div className="text-center py-12">
            <EmptyState
              icon={<ReceiptIcon size={48} />}
              title="No Receipts Yet"
              description="Complete a purchase to receive your first private receipt"
            />
            <div className="mt-6 space-y-3">
              <Button onClick={handleRefresh} variant="secondary">
                <RefreshIcon size={18} className="mr-2" />
                Refresh Receipts
              </Button>
              <p className="text-xs text-slate-500 mt-4">
                If you just made a purchase, wait 30 seconds then refresh.<br/>
                If you see "NOT_GRANTED" error: disconnect wallet, refresh page, and reconnect.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {receipts.map((receipt, index) => (
              <motion.div
                key={receipt._nonce || `receipt-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden">
                  {/* Receipt Header */}
                  <button
                    onClick={() => {
                      const receiptId = receipt._nonce || `receipt-${index}`;
                      console.log('Clicking receipt:', receiptId, 'current expanded:', expandedReceipt);
                      setExpandedReceipt(expandedReceipt === receiptId ? null : receiptId);
                    }}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-r from-veil-500/20 to-receipt-500/20 rounded-xl">
                        <ReceiptIcon size={24} className="text-veil-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {formatCredits(receipt.total)} ₳
                        </p>
                        <p className="text-sm text-slate-400">
                          Merchant: {truncateAddress(receipt.merchant, 6)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {receipt._fromWallet ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="warning">Display Only</Badge>
                      )}
                      {expandedReceipt === (receipt._nonce || `receipt-${index}`) ? (
                        <ChevronDownIcon size={20} className="text-slate-400" />
                      ) : (
                        <ChevronRightIcon size={20} className="text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedReceipt === (receipt._nonce || `receipt-${index}`) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 mt-4 border-t border-slate-700">
                          {/* Warning if not from wallet */}
                          {!receipt._fromWallet && (
                            <div className="mb-4 p-3 bg-amber-900/30 border border-amber-700/50 rounded-xl">
                              <p className="text-sm text-amber-300">
                                ⚠️ This receipt is from backend storage. To use returns, loyalty, or support proof features, 
                                please disconnect and reconnect your wallet to grant record access permissions.
                              </p>
                            </div>
                          )}
                          
                          {/* Receipt Details */}
                          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div>
                              <p className="text-slate-400">Timestamp</p>
                              <p className="text-white">{formatDate(receipt.timestamp)}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Cart Commitment</p>
                              <p className="text-white font-mono text-xs truncate">
                                {receipt.cart_commitment}
                              </p>
                            </div>
                          </div>

                          {/* UTXO Warning */}
                          {receipt._fromWallet && (
                            <div className="p-2 bg-amber-900/20 border border-amber-700/50 rounded-lg mb-3">
                              <p className="text-xs text-amber-400">
                                ⚠️ <strong>Note:</strong> Each receipt can only be used ONCE for either Return OR Loyalty claim (UTXO model). 
                                Support Proof can be generated multiple times without consuming the receipt.
                              </p>
                            </div>
                          )}

                          {/* Actions - only enabled for wallet records */}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenReturn(receipt)}
                              icon={<ReturnIcon size={16} />}
                              disabled={!receipt._fromWallet}
                              title={receipt._fromWallet ? "Process a return (consumes receipt)" : "Wallet record required"}
                            >
                              Process Return
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenLoyalty(receipt)}
                              icon={<AwardIcon size={16} />}
                              disabled={!receipt._fromWallet}
                              title={receipt._fromWallet ? "Claim loyalty points (consumes receipt)" : "Wallet record required"}
                            >
                              Claim Loyalty
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenProof(receipt)}
                              icon={<FileIcon size={16} />}
                              disabled={!receipt._fromWallet}
                              title={receipt._fromWallet ? "Generate proof (does NOT consume receipt)" : "Wallet record required"}
                            >
                              Support Proof
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Return Modal */}
        <Modal
          isOpen={showReturnModal}
          onClose={() => setShowReturnModal(false)}
          title="Process Return"
        >
          <div className="space-y-4">
            <p className="text-slate-300">
              Select a reason for your return. This will consume the receipt and generate a return claim.
            </p>
            
            <Select
              label="Return Reason"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              options={[
                { value: '', label: 'Select a reason...' },
                ...RETURN_REASONS.map(r => ({ value: r.id, label: r.label }))
              ]}
            />

            <div className="p-3 bg-amber-900/30 border border-amber-700/50 rounded-xl space-y-2">
              <p className="text-sm text-amber-300 font-medium">
                ⚠️ Important: UTXO Model
              </p>
              <p className="text-xs text-amber-300/80">
                This action <strong>consumes</strong> the receipt permanently. After processing a return, 
                you cannot use this receipt for loyalty claims. Each receipt can only be used ONCE.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="secondary" onClick={() => setShowReturnModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSubmitReturn} disabled={!returnReason} className="flex-1">
                Submit Return
              </Button>
            </div>
          </div>
        </Modal>

        {/* Loyalty Modal */}
        <Modal
          isOpen={showLoyaltyModal}
          onClose={() => setShowLoyaltyModal(false)}
          title="Claim Loyalty Stamp"
        >
          <div className="space-y-4">
            <p className="text-slate-300">
              Select your loyalty tier. Each receipt can only be used for one loyalty claim.
            </p>

            <div className="p-3 bg-amber-900/30 border border-amber-700/50 rounded-xl space-y-2">
              <p className="text-xs text-amber-300/80">
                ⚠️ This action <strong>consumes</strong> the receipt. After claiming loyalty, 
                you cannot use this receipt for returns.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {Object.entries(LOYALTY_TIERS).map(([tier, info]) => (
                <button
                  key={tier}
                  onClick={() => setLoyaltyTier(Number(tier))}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    loyaltyTier === Number(tier)
                      ? 'border-veil-500 bg-veil-900/30'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <LoyaltyIcon
                    size={24}
                    style={{ color: info.color }}
                    className="mx-auto mb-2"
                  />
                  <p className="font-semibold text-white">{info.name}</p>
                </button>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="secondary" onClick={() => setShowLoyaltyModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSubmitLoyalty} className="flex-1">
                Claim {LOYALTY_TIERS[loyaltyTier as keyof typeof LOYALTY_TIERS].name}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Support Proof Modal */}
        <Modal
          isOpen={showProofModal}
          onClose={() => setShowProofModal(false)}
          title="Generate Support Proof"
        >
          <div className="space-y-4">
            <p className="text-slate-300">
              Generate a proof token to verify your purchase without revealing all receipt details.
              This does NOT consume the receipt.
            </p>

            {proofToken ? (
              <div className="p-4 bg-slate-700/50 rounded-xl">
                <p className="text-sm text-slate-400 mb-2">Your Proof Token:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-veil-400 font-mono break-all">
                    {proofToken}
                  </code>
                  <Button variant="ghost" size="sm" onClick={copyProofToken}>
                    <CopyIcon size={16} />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleGenerateProof}
                loading={txStatus === 'signing'}
                className="w-full"
              >
                Generate Proof Token
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={() => setShowProofModal(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </Modal>

        {/* Transaction Status Modal */}
        <Modal
          isOpen={showTxModal}
          onClose={() => txStatus !== 'pending' && setShowTxModal(false)}
          title="Processing Transaction"
        >
          <div className="text-center py-8">
            {txStatus === 'signing' && (
              <>
                <LoadingSpinner size={48} className="mx-auto mb-4" />
                <p className="text-slate-300">Waiting for wallet signature...</p>
              </>
            )}

            {txStatus === 'pending' && (
              <>
                <LoadingSpinner size={48} className="mx-auto mb-4" />
                <p className="text-slate-300">Transaction submitted</p>
                <p className="text-sm text-slate-400 mt-2">Waiting for confirmation...</p>
              </>
            )}

            {txStatus === 'confirmed' && (
              <>
                <SuccessCheck size={48} className="mx-auto mb-4" />
                <p className="text-green-400 font-semibold">Success!</p>
                <Button onClick={() => setShowTxModal(false)} className="mt-6">
                  Close
                </Button>
              </>
            )}

            {txStatus === 'failed' && (
              <>
                <ErrorX size={48} className="mx-auto mb-4" />
                <p className="text-red-400 font-semibold">Transaction Failed</p>
                <p className="text-sm text-slate-400 mt-2">
                  This may occur if the nullifier was already used
                </p>
                <Button variant="secondary" onClick={() => setShowTxModal(false)} className="mt-6">
                  Close
                </Button>
              </>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default ReceiptsPage;
