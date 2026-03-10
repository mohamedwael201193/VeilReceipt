// Verify Page — Receipt-gated access tokens & anonymous reviews

import { FC, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useVeilWallet } from '@/hooks/useVeilWallet';
import { Button, Card, Badge, EmptyState, Input, Modal, PillNav, SectionHeader } from '@/components/ui/Components';
import { LoadingSpinner } from '@/components/icons/Icons';
import {
  ShieldIcon,
  AwardIcon,
  RefreshIcon,
  CheckIcon,
  LoyaltyIcon,
  PackageIcon,

} from '@/components/icons/Icons';
import { GridBackground } from '@/components/effects/CosmicBackground';
import { truncateAddress } from '@/lib/utils';
import { formatCredits } from '@/lib/stablecoin';
import type { BuyerReceiptRecord } from '@/lib/types';

type TabId = 'access' | 'reviews' | 'tokens';

const tierLabels: Record<number, string> = {
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
  4: 'Platinum',
  5: 'Diamond',
};

const tierColors: Record<number, string> = {
  1: 'text-amber-600',
  2: 'text-gray-300',
  3: 'text-yellow-400',
  4: 'text-cyan-300',
  5: 'text-purple-400',
};

const Verify: FC = () => {
  const {
    connected,
    getBuyerReceipts,
    mintAccessToken,
    submitAnonymousReview,
    getAccessTokens,
    getReviewTokens,
  } = useVeilWallet();

  const [tab, setTab] = useState<TabId>('access');
  const [receipts, setReceipts] = useState<BuyerReceiptRecord[]>([]);
  const [accessTokens, setAccessTokens] = useState<any[]>([]);
  const [reviewTokens, setReviewTokens] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Access token modal
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<BuyerReceiptRecord | null>(null);
  const [gateId, setGateId] = useState('');
  const [tier, setTier] = useState(1);

  // Review modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewReceipt, setReviewReceipt] = useState<BuyerReceiptRecord | null>(null);
  const [productHash, setProductHash] = useState('');
  const [rating, setRating] = useState(5);

  const loadRecords = useCallback(async () => {
    if (!connected) return;
    setLoadingRecords(true);
    try {
      const [r, at, rt] = await Promise.all([
        getBuyerReceipts(),
        getAccessTokens(),
        getReviewTokens(),
      ]);
      setReceipts(r);
      setAccessTokens(at);
      setReviewTokens(rt);
    } catch (err) {
      console.error('Failed to load records:', err);
      toast.error('Failed to load records');
    } finally {
      setLoadingRecords(false);
    }
  }, [connected, getBuyerReceipts, getAccessTokens, getReviewTokens]);

  useEffect(() => {
    if (connected) loadRecords();
  }, [connected, loadRecords]);

  const handleMintAccess = async () => {
    if (!selectedReceipt || !gateId) return;
    setActionLoading('mint');
    try {
      await mintAccessToken(selectedReceipt, gateId, tier);
      setAccessModalOpen(false);
      setGateId('');
      setTier(1);
      toast.success('Access token minting in progress — check My Tokens shortly');
      // Auto-refresh + switch to tokens tab after wallet syncs
      setTimeout(() => { loadRecords(); setTab('tokens'); }, 8000);
      setTimeout(loadRecords, 20000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to mint access token');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewReceipt || !productHash) return;
    setActionLoading('review');
    try {
      await submitAnonymousReview(reviewReceipt, productHash, rating);
      setReviewModalOpen(false);
      setProductHash('');
      setRating(5);
      toast.success('Review submitted — check My Tokens shortly');
      // Auto-refresh + switch to tokens tab after wallet syncs
      setTimeout(() => { loadRecords(); setTab('tokens'); }, 8000);
      setTimeout(loadRecords, 20000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setActionLoading(null);
    }
  };

  if (!connected) {
    return (
      <div className="relative min-h-screen pt-28 pb-16">
        <GridBackground />
        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <EmptyState
            icon={<ShieldIcon size={48} className="text-white/20" />}
            title="Connect your wallet"
            description="Connect your Shield wallet to access verification features"
          />
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'access' as TabId, label: 'Access Tokens', count: receipts.length },
    { id: 'reviews' as TabId, label: 'Reviews', count: receipts.length },
    { id: 'tokens' as TabId, label: 'My Tokens', count: accessTokens.length + reviewTokens.length },
  ];

  return (
    <div className="relative min-h-screen pt-28 pb-16">
      <GridBackground />
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <SectionHeader
          title="Verify & Review"
          subtitle="Mint receipt-gated access tokens and submit anonymous verified reviews — all powered by zero-knowledge proofs"
        />

        <div className="flex items-center justify-between mb-8">
          <PillNav
            tabs={tabs.map(t => ({ id: t.id, label: t.label, count: t.count }))}
            active={tab}
            onChange={(id) => setTab(id as TabId)}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={loadRecords}
            disabled={loadingRecords}
          >
            <RefreshIcon size={14} className={loadingRecords ? 'animate-spin' : ''} />
            <span className="ml-1.5">Refresh</span>
          </Button>
        </div>

        {loadingRecords && (
          <div className="flex justify-center py-20">
            <LoadingSpinner size={32} className="text-white/40" />
          </div>
        )}

        {!loadingRecords && (
          <AnimatePresence mode="wait">
            {/* ACCESS TOKEN TAB */}
            {tab === 'access' && (
              <motion.div
                key="access"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {receipts.length === 0 ? (
                  <EmptyState
                    icon={<AwardIcon size={48} className="text-white/20" />}
                    title="No receipts found"
                    description="Make a purchase first to mint access tokens"
                  />
                ) : (
                  <div className="grid gap-4">
                    <p className="text-white/50 text-sm mb-2">
                      Select a receipt to mint a gated access token. The token proves your purchase without revealing payment details.
                    </p>
                    {receipts.map((r, i) => (
                      <Card key={i} className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <PackageIcon size={14} className="text-white/40" />
                              <span className="text-xs font-mono text-white/40">
                                {truncateAddress(r.purchase_commitment)}
                              </span>
                              <Badge variant={r.token_type === 0 ? 'default' : 'info'}>
                                {r.token_type === 0 ? 'Credits' : 'USDCx'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-white/60">
                                Total: <span className="text-white font-medium">{formatCredits(r.total)}</span>
                              </span>
                              <span className="text-white/40">
                                Merchant: {truncateAddress(r.merchant)}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedReceipt(r);
                              setAccessModalOpen(true);
                            }}
                            disabled={!!actionLoading}
                          >
                            <AwardIcon size={14} />
                            <span className="ml-1.5">Mint Token</span>
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* REVIEWS TAB */}
            {tab === 'reviews' && (
              <motion.div
                key="reviews"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {receipts.length === 0 ? (
                  <EmptyState
                    icon={<LoyaltyIcon size={48} className="text-white/20" />}
                    title="No receipts found"
                    description="Make a purchase first to submit anonymous reviews"
                  />
                ) : (
                  <div className="grid gap-4">
                    <p className="text-white/50 text-sm mb-2">
                      Submit verified reviews without revealing your identity.
                      The contract uses nullifiers to prevent double-reviews per product.
                    </p>
                    {receipts.map((r, i) => (
                      <Card key={i} className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <PackageIcon size={14} className="text-white/40" />
                              <span className="text-xs font-mono text-white/40">
                                {truncateAddress(r.purchase_commitment)}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-white/60">
                                Total: <span className="text-white font-medium">{formatCredits(r.total)}</span>
                              </span>
                              <span className="text-white/40">
                                {truncateAddress(r.merchant)}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setReviewReceipt(r);
                              setReviewModalOpen(true);
                            }}
                            disabled={!!actionLoading}
                          >
                            <LoyaltyIcon size={14} />
                            <span className="ml-1.5">Review</span>
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* MY TOKENS TAB */}
            {tab === 'tokens' && (
              <motion.div
                key="tokens"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {accessTokens.length === 0 && reviewTokens.length === 0 ? (
                  <EmptyState
                    icon={<ShieldIcon size={48} className="text-white/20" />}
                    title="No tokens yet"
                    description="Mint access tokens or submit reviews to see them here"
                  />
                ) : (
                  <div className="space-y-6">
                    {accessTokens.length > 0 && (
                      <div>
                        <h3 className="text-white/60 text-sm font-medium mb-3 flex items-center gap-2">
                          <AwardIcon size={14} />
                          Access Tokens ({accessTokens.length})
                        </h3>
                        <div className="grid gap-3">
                          {accessTokens.map((t, i) => (
                            <Card key={i} className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                                    <AwardIcon size={18} className={tierColors[t.token_tier] || 'text-white/40'} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-white">
                                      {tierLabels[t.token_tier] || `Tier ${t.token_tier}`} Access
                                    </p>
                                    <p className="text-xs text-white/40 font-mono">
                                      {truncateAddress(t.gate_commitment)}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge variant="success">
                                    <CheckIcon size={10} className="mr-1" />
                                    Verified
                                  </Badge>
                                  <p className="text-xs text-white/30 mt-1">
                                    {truncateAddress(t.merchant)}
                                  </p>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {reviewTokens.length > 0 && (
                      <div>
                        <h3 className="text-white/60 text-sm font-medium mb-3 flex items-center gap-2">
                          <LoyaltyIcon size={14} />
                          Review Tokens ({reviewTokens.length})
                        </h3>
                        <div className="grid gap-3">
                          {reviewTokens.map((t, i) => (
                            <Card key={i} className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                                    <LoyaltyIcon size={18} className="text-yellow-400" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-white flex items-center gap-1">
                                      {Array.from({ length: t.rating }).map((_, si) => (
                                        <LoyaltyIcon key={si} size={12} className="text-yellow-400 fill-yellow-400" />
                                      ))}
                                      {Array.from({ length: 5 - t.rating }).map((_, si) => (
                                        <LoyaltyIcon key={si} size={12} className="text-white/10" />
                                      ))}
                                    </p>
                                    <p className="text-xs text-white/40 font-mono">
                                      Product: {truncateAddress(t.product_hash)}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="info">
                                  Anonymous
                                </Badge>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Mint Access Token Modal */}
        <Modal
          isOpen={accessModalOpen}
          onClose={() => setAccessModalOpen(false)}
          title="Mint Access Token"
        >
          <div className="space-y-4">
            <p className="text-sm text-white/50">
              Mint a receipt-gated access token. This proves you made a purchase at the merchant without revealing payment details.
            </p>
            {selectedReceipt && (
              <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                <p className="text-xs text-white/40">Receipt</p>
                <p className="text-sm font-mono text-white/70">
                  {truncateAddress(selectedReceipt.purchase_commitment)}
                </p>
                <p className="text-xs text-white/40 mt-1">
                  {formatCredits(selectedReceipt.total)} to {truncateAddress(selectedReceipt.merchant)}
                </p>
              </div>
            )}
            <Input
              label="Gate ID (content/perk identifier)"
              value={gateId}
              onChange={(e) => setGateId(e.target.value)}
              placeholder="e.g. exclusive_content_2024"
            />
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Tier</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(t => (
                  <button
                    key={t}
                    onClick={() => setTier(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      tier === t
                        ? 'bg-white/10 text-white border border-white/20'
                        : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:border-white/10'
                    }`}
                  >
                    {tierLabels[t]}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={handleMintAccess}
              disabled={!gateId || actionLoading === 'mint'}
              className="w-full"
            >
              {actionLoading === 'mint' ? (
                <LoadingSpinner size={16} />
              ) : (
                <>
                  <AwardIcon size={14} />
                  <span className="ml-2">Mint Access Token</span>
                </>
              )}
            </Button>
          </div>
        </Modal>

        {/* Submit Review Modal */}
        <Modal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          title="Submit Anonymous Review"
        >
          <div className="space-y-4">
            <p className="text-sm text-white/50">
              Your review is verified by the contract but your identity stays private. A nullifier prevents double-reviewing.
            </p>
            {reviewReceipt && (
              <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                <p className="text-xs text-white/40">Receipt</p>
                <p className="text-sm font-mono text-white/70">
                  {truncateAddress(reviewReceipt.purchase_commitment)}
                </p>
              </div>
            )}
            <Input
              label="Product Hash (SKU or product identifier)"
              value={productHash}
              onChange={(e) => setProductHash(e.target.value)}
              placeholder="e.g. product SKU hash"
            />
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(r => (
                  <button
                    key={r}
                    onClick={() => setRating(r)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <LoyaltyIcon
                      size={28}
                      className={r <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/10'}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/30 mt-1">{rating} / 5 stars</p>
            </div>
            <Button
              onClick={handleSubmitReview}
              disabled={!productHash || actionLoading === 'review'}
              variant="secondary"
              className="w-full"
            >
              {actionLoading === 'review' ? (
                <LoadingSpinner size={16} />
              ) : (
                <>
                  <LoyaltyIcon size={14} />
                  <span className="ml-2">Submit Review</span>
                </>
              )}
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default Verify;
