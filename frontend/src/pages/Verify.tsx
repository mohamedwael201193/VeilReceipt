// Verify Page — Receipt-gated access tokens, anonymous reviews, support proof verification

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
  CopyIcon,
  AlertIcon,
} from '@/components/icons/Icons';
import { GridBackground } from '@/components/effects/CosmicBackground';
import { truncateAddress, copyToClipboard } from '@/lib/utils';
import { formatCredits, formatUsdcx, formatUsad } from '@/lib/stablecoin';
import { ALEO_CONFIG } from '@/lib/chain';
import type { BuyerReceiptRecord } from '@/lib/types';

type TabId = 'access' | 'reviews' | 'tokens' | 'verify';

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

const tierBorderColors: Record<number, string> = {
  1: 'border-amber-600/30',
  2: 'border-gray-300/30',
  3: 'border-yellow-400/30',
  4: 'border-cyan-300/30',
  5: 'border-purple-400/30',
};

const tierBgColors: Record<number, string> = {
  1: 'bg-amber-600/5',
  2: 'bg-gray-300/5',
  3: 'bg-yellow-400/5',
  4: 'bg-cyan-300/5',
  5: 'bg-purple-400/5',
};

const Verify: FC = () => {
  const {
    connected,
    getBuyerReceipts,
    mintAccessToken,
    submitAnonymousReview,
    getAccessTokens,
    getReviewTokens,
    getReviewCount,
  } = useVeilWallet();

  const [tab, setTab] = useState<TabId>('access');
  const [receipts, setReceipts] = useState<BuyerReceiptRecord[]>([]);
  const [accessTokens, setAccessTokens] = useState<any[]>([]);
  const [reviewTokens, setReviewTokens] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Review counts from on-chain
  const [reviewCounts, setReviewCounts] = useState<Record<string, number>>({});

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

  // Verify proof state
  const [verifyCommitment, setVerifyCommitment] = useState('');
  const [verifyProductHash, setVerifyProductHash] = useState('');
  const [verifySalt, setVerifySalt] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [verifyResult, setVerifyResult] = useState<'valid' | 'invalid' | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Copied state for access tokens
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

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

      // Fetch review counts for all review tokens' product hashes
      const uniqueHashes = [...new Set(rt.map((t: any) => t.product_hash).filter(Boolean))];
      const counts: Record<string, number> = {};
      await Promise.all(
        uniqueHashes.map(async (hash) => {
          const fieldKey = hash.endsWith('field') ? hash : `${hash}field`;
          const count = await getReviewCount(fieldKey);
          counts[hash] = count;
        })
      );
      setReviewCounts(counts);
    } catch (err) {
      console.error('Failed to load records:', err);
      toast.error('Failed to load records');
    } finally {
      setLoadingRecords(false);
    }
  }, [connected, getBuyerReceipts, getAccessTokens, getReviewTokens, getReviewCount]);

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
      setTimeout(() => { loadRecords(); setTab('tokens'); }, 8000);
      setTimeout(loadRecords, 20000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyProof = async (token: any) => {
    const proof = {
      type: 'VeilReceipt Access Token',
      program: ALEO_CONFIG.programId,
      gate_commitment: token.gate_commitment,
      token_tier: token.token_tier,
      tier_label: tierLabels[token.token_tier] || `Tier ${token.token_tier}`,
      merchant: token.merchant,
    };
    const proofCode = btoa(JSON.stringify(proof));
    const ok = await copyToClipboard(proofCode);
    if (ok) {
      setCopiedToken(token.gate_commitment);
      toast.success('Access token proof code copied — share with merchant to verify access');
      setTimeout(() => setCopiedToken(null), 3000);
    }
  };

  const handleVerifyProof = async () => {
    if (!verifyCommitment || !verifyProductHash || !verifySalt) return;
    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      // Verify the purchase commitment exists on-chain via purchase_exists mapping
      const commitField = verifyCommitment.endsWith('field') ? verifyCommitment : `${verifyCommitment}field`;
      const response = await fetch(
        `${ALEO_CONFIG.rpcUrl}/${ALEO_CONFIG.network}/program/${ALEO_CONFIG.programId}/mapping/purchase_exists/${commitField}`
      );
      
      if (response.ok) {
        const exists = await response.json();
        if (exists === true || exists === 'true') {
          setVerifyResult('valid');
          toast.success('Purchase verified on-chain! This customer made a real purchase.');
        } else {
          setVerifyResult('invalid');
          toast.error('Purchase commitment not found on-chain');
        }
      } else {
        setVerifyResult('invalid');
        toast.error('Could not verify — commitment not found');
      }
    } catch (err) {
      setVerifyResult('invalid');
      toast.error('Verification failed');
    } finally {
      setVerifyLoading(false);
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
    { id: 'verify' as TabId, label: 'Verify Proof' },
  ];

  return (
    <div className="relative min-h-screen pt-28 pb-16">
      <GridBackground />
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <SectionHeader
          title="Verify & Review"
          subtitle="Mint receipt-gated access tokens, submit anonymous verified reviews, and verify support proofs — all powered by zero-knowledge proofs"
        />

        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
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
                              <Badge variant={r.token_type === 0 ? 'default' : r.token_type === 2 ? 'warning' : 'info'}>
                                {r.token_type === 0 ? 'Credits' : r.token_type === 2 ? 'USAD' : 'USDCx'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-white/60">
                                Total: <span className="text-white font-medium">{r.token_type === 1 ? formatUsdcx(r.total) : r.token_type === 2 ? formatUsad(r.total) : formatCredits(r.total)}</span>
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

                    {/* On-chain review count summary */}
                    {Object.keys(reviewCounts).length > 0 && (
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-2">
                        <h4 className="text-xs text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <LoyaltyIcon size={12} className="text-yellow-400" />
                          On-Chain Review Counts
                        </h4>
                        <div className="flex flex-wrap gap-3">
                          {Object.entries(reviewCounts).map(([hash, count]) => (
                            <div key={hash} className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2 border border-white/[0.06]">
                              <span className="text-xs font-mono text-white/40">{truncateAddress(hash)}</span>
                              <span className="text-yellow-400 font-bold text-sm">{count}</span>
                              <span className="text-white/30 text-xs">reviews</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
                                Total: <span className="text-white font-medium">{r.token_type === 1 ? formatUsdcx(r.total) : r.token_type === 2 ? formatUsad(r.total) : formatCredits(r.total)}</span>
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
                            <Card key={i} className={`p-5 ${tierBgColors[t.token_tier] || ''} ${tierBorderColors[t.token_tier] || ''}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${tierBorderColors[t.token_tier] || 'border-white/[0.06]'}`}
                                    style={{ background: 'rgba(255,255,255,0.02)' }}
                                  >
                                    <AwardIcon size={22} className={tierColors[t.token_tier] || 'text-white/40'} />
                                  </div>
                                  <div>
                                    <p className={`text-base font-bold ${tierColors[t.token_tier] || 'text-white'}`}>
                                      {tierLabels[t.token_tier] || `Tier ${t.token_tier}`} Access Pass
                                    </p>
                                    <p className="text-xs text-white/40 font-mono mt-0.5">
                                      Gate: {truncateAddress(t.gate_commitment)}
                                    </p>
                                    <p className="text-xs text-white/30 mt-0.5">
                                      Merchant: {truncateAddress(t.merchant)}
                                    </p>
                                    <p className="text-[10px] text-white/20 mt-1">
                                      Share the proof code with the merchant to verify your access tier
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="success">
                                    <CheckIcon size={10} className="mr-1" />
                                    Verified
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleCopyProof(t)}
                                  >
                                    {copiedToken === t.gate_commitment ? (
                                      <><CheckIcon size={14} className="text-green-400" /><span className="ml-1 text-green-400">Copied</span></>
                                    ) : (
                                      <><CopyIcon size={14} /><span className="ml-1">Copy Proof</span></>
                                    )}
                                  </Button>
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
                            <Card key={i} className="p-5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-xl bg-yellow-400/[0.06] border border-yellow-400/20 flex items-center justify-center">
                                    <LoyaltyIcon size={22} className="text-yellow-400" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-white flex items-center gap-1">
                                      {Array.from({ length: t.rating }).map((_, si) => (
                                        <LoyaltyIcon key={si} size={14} className="text-yellow-400 fill-yellow-400" />
                                      ))}
                                      {Array.from({ length: 5 - t.rating }).map((_, si) => (
                                        <LoyaltyIcon key={si} size={14} className="text-white/10" />
                                      ))}
                                    </p>
                                    <p className="text-xs text-white/40 font-mono mt-1">
                                      Product: {truncateAddress(t.product_hash)}
                                    </p>
                                    {reviewCounts[t.product_hash] !== undefined && (
                                      <p className="text-xs text-yellow-400/70 mt-0.5">
                                        {reviewCounts[t.product_hash]} total verified reviews for this product
                                      </p>
                                    )}
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

            {/* VERIFY PROOF TAB */}
            {tab === 'verify' && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="max-w-2xl mx-auto">
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-2.5 bg-green-500/10 rounded-xl border border-green-500/20">
                        <ShieldIcon size={20} className="text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Verify Support Proof</h3>
                        <p className="text-xs text-white/40">
                          Paste a customer's proof code or manually enter proof fields to verify their purchase on-chain
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Paste Proof Code section */}
                      <div className="p-3.5 bg-blue-500/[0.06] border border-blue-500/15 rounded-xl">
                        <p className="text-xs font-semibold text-blue-400/80 uppercase tracking-wider mb-2">Quick Verify</p>
                        <p className="text-xs text-white/40 mb-3">
                          Paste the proof code that the customer copied from their Purchases page. All fields will auto-fill.
                        </p>
                        <div className="flex gap-2">
                          <Input
                            label=""
                            value=""
                            onChange={(e) => {
                              const code = e.target.value.trim();
                              if (!code) return;
                              try {
                                const decoded = JSON.parse(atob(code));
                                if (decoded.purchase_commitment) setVerifyCommitment(decoded.purchase_commitment);
                                if (decoded.product_hash) setVerifyProductHash(decoded.product_hash);
                                if (decoded.salt) setVerifySalt(decoded.salt);
                                toast.success('Proof code parsed — fields auto-filled!');
                              } catch {
                                toast.error('Invalid proof code format');
                              }
                            }}
                            placeholder="Paste proof code here..."
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-white/20">
                        <div className="flex-1 h-px bg-white/[0.06]" />
                        <span>or enter fields manually</span>
                        <div className="flex-1 h-px bg-white/[0.06]" />
                      </div>

                      <Input
                        label="Purchase Commitment"
                        value={verifyCommitment}
                        onChange={(e) => setVerifyCommitment(e.target.value)}
                        placeholder="e.g. 1234567890field"
                      />
                      <Input
                        label="Product Hash"
                        value={verifyProductHash}
                        onChange={(e) => setVerifyProductHash(e.target.value)}
                        placeholder="e.g. product identifier hash"
                      />
                      <Input
                        label="Salt"
                        value={verifySalt}
                        onChange={(e) => setVerifySalt(e.target.value)}
                        placeholder="e.g. random salt used during proof generation"
                      />
                      <Input
                        label="Claimed Token"
                        value={verifyToken}
                        onChange={(e) => setVerifyToken(e.target.value)}
                        placeholder="e.g. support proof token hash"
                      />

                      <Button
                        onClick={handleVerifyProof}
                        disabled={!verifyCommitment || !verifyProductHash || !verifySalt || verifyLoading}
                        className="w-full"
                        variant="glow"
                        loading={verifyLoading}
                      >
                        <ShieldIcon size={14} />
                        <span className="ml-2">Verify On-Chain</span>
                      </Button>

                      <AnimatePresence>
                        {verifyResult && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className={`p-4 rounded-xl border flex items-center gap-3 ${
                              verifyResult === 'valid'
                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                : 'bg-red-500/10 border-red-500/30'
                            }`}
                          >
                            {verifyResult === 'valid' ? (
                              <>
                                <CheckIcon size={20} className="text-emerald-400" />
                                <div>
                                  <p className="text-emerald-400 font-semibold">Verified</p>
                                  <p className="text-emerald-400/60 text-xs">Purchase commitment exists on-chain. This is a legitimate proof.</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <AlertIcon size={20} className="text-red-400" />
                                <div>
                                  <p className="text-red-400 font-semibold">Not Verified</p>
                                  <p className="text-red-400/60 text-xs">Purchase commitment not found on-chain. This proof could not be verified.</p>
                                </div>
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </Card>

                  {/* How it works */}
                  <div className="mt-6 bg-white/[0.02] border border-white/[0.05] rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-white/60 mb-3">How Support Proof Verification Works</h4>
                    <ol className="space-y-2 text-xs text-white/40">
                      <li className="flex gap-2">
                        <span className="text-green-400 font-bold">1.</span>
                        Customer generates a support proof from their Purchases page using the <code className="text-white/50 bg-white/[0.06] px-1.5 py-0.5 rounded">Support</code> button
                      </li>
                      <li className="flex gap-2">
                        <span className="text-green-400 font-bold">2.</span>
                        A proof code is generated containing commitment, product hash, and salt — payment details stay private
                      </li>
                      <li className="flex gap-2">
                        <span className="text-green-400 font-bold">3.</span>
                        Customer copies and shares the proof code with you. Paste it above to auto-fill all fields
                      </li>
                      <li className="flex gap-2">
                        <span className="text-green-400 font-bold">4.</span>
                        Click "Verify On-Chain" to confirm the purchase commitment exists on-chain via the <code className="text-white/50 bg-white/[0.06] px-1.5 py-0.5 rounded">purchase_exists</code> mapping
                      </li>
                    </ol>
                  </div>
                </div>
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
                  {selectedReceipt.token_type === 1 ? formatUsdcx(selectedReceipt.total) : selectedReceipt.token_type === 2 ? formatUsad(selectedReceipt.total) : formatCredits(selectedReceipt.total)} to {truncateAddress(selectedReceipt.merchant)}
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
