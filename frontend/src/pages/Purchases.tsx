// Purchases Page — View purchase history and generate ZK proofs

import { FC, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useVeilWallet } from '@/hooks/useVeilWallet';
import { Button, Card, Badge, EmptyState, Input, Modal, SectionHeader } from '@/components/ui/Components';
import { LoadingSpinner, TokenAmount, TokenIcon } from '@/components/icons/Icons';
import {
  PackageIcon,
  ShieldIcon,
  RefreshIcon,
} from '@/components/icons/Icons';
import { GridBackground } from '@/components/effects/CosmicBackground';
import { truncateAddress, formatDate } from '@/lib/utils';
import { formatCredits, formatUsdcx } from '@/lib/stablecoin';
import { listStoredPurchases } from '@/lib/merkle';
import type { BuyerReceiptRecord } from '@/lib/types';

const Purchases: FC = () => {
  const {
    connected, address,
    getBuyerReceipts,
    provePurchaseSupport,
    proveCartItem,
  } = useVeilWallet();

  const [receipts, setReceipts] = useState<BuyerReceiptRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [merkleKeys, setMerkleKeys] = useState<string[]>([]);

  // Cart item proof modal
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [proofItemIndex, setProofItemIndex] = useState('0');
  const [proofVerifier, setProofVerifier] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<BuyerReceiptRecord | null>(null);

  const loadData = useCallback(async () => {
    if (!connected || !address) return;
    setLoading(true);
    try {
      const r = await getBuyerReceipts();
      setReceipts(r);
      setMerkleKeys(listStoredPurchases(address));
    } catch (err) {
      console.error('Failed to load purchases:', err);
      toast.error('Failed to load purchase history');
    } finally {
      setLoading(false);
    }
  }, [connected, address, getBuyerReceipts]);

  useEffect(() => {
    if (connected) loadData();
  }, [connected, loadData]);

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

  const handleProveCartItem = async () => {
    if (!selectedReceipt) return;
    setActionLoading('prove_item');
    try {
      const idx = parseInt(proofItemIndex);
      const verifier = proofVerifier || address || '';
      await proveCartItem(selectedReceipt, idx, verifier);
      setProofModalOpen(false);
      toast.success('Cart item proof submitted!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to prove cart item');
    } finally {
      setActionLoading(null);
    }
  };

  const hasMerkleData = (receipt: BuyerReceiptRecord) => {
    return merkleKeys.includes(receipt.cart_commitment);
  };

  const formatAmount = (amount: number, tokenType: number) => {
    return tokenType === 1 ? formatUsdcx(amount) : formatCredits(amount);
  };

  if (!connected) {
    return (
      <div className="relative min-h-screen pt-24 flex items-center justify-center">
        <GridBackground className="opacity-20" />
        <div className="relative z-10">
          <EmptyState
            icon={<PackageIcon size={52} className="text-white/20" />}
            title="Connect Wallet"
            description="Connect your Aleo wallet to view your purchase history."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pt-24 pb-16">
      <GridBackground className="opacity-20" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <SectionHeader
            title="My Purchases"
            subtitle="View your private purchase history and generate zero-knowledge proofs for individual cart items"
            action={
              <Button
                variant="secondary"
                icon={<RefreshIcon size={16} />}
                loading={loading}
                onClick={loadData}
              >
                Refresh
              </Button>
            }
          />
        </motion.div>

        {/* Stats Summary */}
        {receipts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Card className="border-green-500/15">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="p-2 bg-green-500/10 rounded-xl">
                      <PackageIcon size={20} className="text-green-400" />
                    </div>
                    <span className="text-white font-bold text-lg">Purchase Summary</span>
                  </div>

                  <div className="flex items-baseline gap-6 mt-3">
                    <div>
                      <span className="text-5xl font-bold text-green-400">
                        {receipts.length}
                      </span>
                      <span className="text-white/30 ml-2 text-sm">purchases</span>
                    </div>
                    <div>
                      <span className="text-2xl font-bold text-blue-400">
                        {merkleKeys.length}
                      </span>
                      <span className="text-white/30 ml-2 text-sm">with Merkle proofs</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 p-3.5 bg-green-500/[0.04] border border-green-500/10 rounded-xl">
                <p className="text-xs text-white/40 leading-relaxed">
                  <strong className="text-white/60">How Merkle proofs work:</strong> Each purchase's cart items are organized into a Merkle tree. You can prove you bought a specific item without revealing the rest of your cart — perfect for warranty claims, returns, or review verification.
                </p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Purchase History */}
        {loading ? (
          <div className="flex justify-center py-24">
            <LoadingSpinner size={40} />
          </div>
        ) : receipts.length === 0 ? (
          <EmptyState
            icon={<PackageIcon size={52} className="text-white/15" />}
            title="No Purchases Yet"
            description="Your private purchase history will appear here after shopping."
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-white">Purchase History</h2>
              <span className="text-sm text-white/30">{receipts.length} purchase{receipts.length !== 1 ? 's' : ''}</span>
            </div>

            {receipts.map((r, idx) => (
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
                          <PackageIcon size={14} className="text-green-400" />
                        </div>
                        <span className="text-white font-medium text-sm">Purchase</span>
                        <Badge variant={r.token_type === 1 ? 'info' : 'success'} dot>
                          <TokenIcon type={r.token_type as 0|1} size={11} className="inline mr-0.5" />
                          {r.token_type === 1 ? 'USDCx' : 'Credits'}
                        </Badge>
                        {hasMerkleData(r) && (
                          <Badge variant="info" dot>Merkle</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 mt-4">
                        <div>
                          <span className="text-xs text-white/30 uppercase tracking-wider">Amount</span>
                          <div className="mt-1">
                            <TokenAmount amount={formatAmount(r.total, r.token_type)} type={r.token_type as 0 | 1} size="lg" />
                          </div>
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
                      {hasMerkleData(r) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedReceipt(r);
                            setProofModalOpen(true);
                          }}
                          icon={<ShieldIcon size={13} />}
                        >
                          Prove Item
                        </Button>
                      )}
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
            ))}
          </div>
        )}
      </div>

      {/* Prove Cart Item Modal */}
      <Modal
        isOpen={proofModalOpen}
        onClose={() => { setProofModalOpen(false); setSelectedReceipt(null); }}
        title="Prove Cart Item"
      >
        <div className="space-y-5">
          <div className="p-3.5 bg-blue-500/[0.06] border border-blue-500/15 rounded-xl space-y-2">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">How it works</p>
            <ul className="text-xs text-white/45 space-y-1 leading-relaxed list-none">
              <li>• Select which item in your cart to prove (by index)</li>
              <li>• The Merkle proof verifies this item was in your cart</li>
              <li>• The recipient only sees the single item — your other purchases stay private</li>
              <li>• Useful for warranty claims, product returns, or review verification</li>
            </ul>
          </div>

          <Input
            label="Item index (0-3)"
            type="number"
            value={proofItemIndex}
            onChange={(e) => setProofItemIndex(e.target.value)}
            placeholder="e.g. 0"
          />
          <Input
            label="Verifier address"
            value={proofVerifier}
            onChange={(e) => setProofVerifier(e.target.value)}
            placeholder="aleo1... (who receives the proof record)"
          />
          <div className="flex gap-3 justify-end pt-1">
            <Button variant="ghost" onClick={() => setProofModalOpen(false)}>Cancel</Button>
            <Button
              variant="glow"
              onClick={handleProveCartItem}
              loading={actionLoading === 'prove_item'}
              icon={<ShieldIcon size={16} />}
            >
              Generate Proof
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Purchases;
