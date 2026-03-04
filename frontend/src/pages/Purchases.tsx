// Purchases Page — View purchase history with loyalty stamps and support proofs

import { FC, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useVeilWallet } from '@/hooks/useVeilWallet';
import { Button, Card, Badge, EmptyState, Input, Modal, SectionHeader } from '@/components/ui/Components';
import { LoadingSpinner, TokenAmount, TokenIcon } from '@/components/icons/Icons';
import {
  PackageIcon,
  ShieldIcon,
  LoyaltyIcon,
  RefreshIcon,
} from '@/components/icons/Icons';
import { GridBackground } from '@/components/effects/CosmicBackground';
import { truncateAddress, formatDate } from '@/lib/utils';
import { formatCredits, formatUsdcx } from '@/lib/stablecoin';
import type { BuyerReceiptRecord, LoyaltyStampRecord } from '@/lib/types';

const Purchases: FC = () => {
  const {
    connected, address,
    getBuyerReceipts, getLoyaltyStamps,
    claimLoyalty, mergeLoyalty, proveLoyaltyTier,
    provePurchaseSupport,
  } = useVeilWallet();

  const [receipts, setReceipts] = useState<BuyerReceiptRecord[]>([]);
  const [stamps, setStamps] = useState<LoyaltyStampRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Loyalty prove modal
  const [proveModalOpen, setProveModalOpen] = useState(false);
  const [proveThreshold, setProveThreshold] = useState('3');
  const [proveVerifier, setProveVerifier] = useState('');
  const [selectedStamp, setSelectedStamp] = useState<LoyaltyStampRecord | null>(null);

  const loadData = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        getBuyerReceipts(),
        getLoyaltyStamps(),
      ]);
      setReceipts(r);
      setStamps(s);
    } catch (err) {
      console.error('Failed to load purchases:', err);
      toast.error('Failed to load purchase history');
    } finally {
      setLoading(false);
    }
  }, [connected, getBuyerReceipts, getLoyaltyStamps]);

  useEffect(() => {
    if (connected) loadData();
  }, [connected, loadData]);

  const handleClaimLoyalty = async (receipt: BuyerReceiptRecord) => {
    setActionLoading(receipt.purchase_commitment);
    try {
      if (stamps.length === 0) {
        await claimLoyalty(receipt);
      } else {
        await mergeLoyalty(receipt, stamps[0]);
      }
      toast.success('Loyalty stamp claimed!');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to claim loyalty');
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

  const handleProveTier = async () => {
    if (!selectedStamp) return;
    setActionLoading('prove');
    try {
      const threshold = parseInt(proveThreshold);
      const verifier = proveVerifier || address || '';
      await proveLoyaltyTier(selectedStamp, threshold, verifier);
      setProveModalOpen(false);
      toast.success('Loyalty badge sent!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to prove tier');
    } finally {
      setActionLoading(null);
    }
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
            subtitle="View your purchase history, claim loyalty stamps, and generate support proofs"
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

        {/* Loyalty Score Card */}
        {stamps.length > 0 && (
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
                      <LoyaltyIcon size={20} className="text-green-400" />
                    </div>
                    <span className="text-white font-bold text-lg">Loyalty Score</span>
                  </div>

                  <div className="flex items-baseline gap-6 mt-3">
                    <div>
                      <span className="text-5xl font-bold text-green-400">
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

              <div className="mt-5 p-3.5 bg-green-500/[0.04] border border-green-500/10 rounded-xl">
                <p className="text-xs text-white/40 leading-relaxed">
                  <strong className="text-white/60">What are stamps for?</strong> Each purchase earns you a stamp. Send your loyalty badge to a merchant to unlock rewards — they only see you qualify (≥ N stamps), never your purchase history or spending amounts.
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
            ))}
          </div>
        )}
      </div>

      {/* Prove Tier Modal */}
      <Modal
        isOpen={proveModalOpen}
        onClose={() => { setProveModalOpen(false); setSelectedStamp(null); }}
        title="Send Loyalty Badge"
      >
        <div className="space-y-5">
          <div className="p-3.5 bg-green-500/[0.06] border border-green-500/15 rounded-xl space-y-2">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">How it works</p>
            <ul className="text-xs text-white/45 space-y-1 leading-relaxed list-none">
              <li>• Every private purchase earns you a stamp</li>
              <li>• Send your badge to a merchant — they confirm you qualify, nothing more</li>
              <li>• Merchants can offer discounts or VIP access to badge holders</li>
              <li>• Your purchase history and exact stamp count stay completely private</li>
            </ul>
          </div>

          {selectedStamp && (
            <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              <p className="text-sm text-white/50">
                Your stamps: <strong className="text-green-400 font-semibold">{selectedStamp.score}</strong>
                <span className="text-white/25 ml-2 text-xs">The recipient only sees whether you meet the minimum</span>
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

export default Purchases;
