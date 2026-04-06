// Pay Page — Handles payment sessions AND payment links
// URL: /pay/:sessionId  (e-commerce session)
// URL: /pay?link=<hash> (shareable payment link)

import { FC, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useVeilWallet } from '@/hooks/useVeilWallet';
import { api } from '@/lib/api';
import { Button, Badge } from '@/components/ui/Components';
import { LoadingSpinner } from '@/components/icons/Icons';
import { ShieldIcon, PublicIcon, ClockIcon } from '@/components/icons/Icons';
import { formatCredits, formatUsdcx, formatUsad } from '@/lib/stablecoin';
import { hashAddressSync } from '@/lib/utils';
import type { PaymentPrivacy, TokenType } from '@/lib/chain';
import type { PaymentLinkPublic } from '@/lib/types';

const CURRENCY_LOGOS: Record<string, string> = {
  credits: '/aleoicon.png',
  usdcx: '/usdcx.svg',
  usad: '/USAD.svg',
};

interface SessionData {
  id: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
  merchant_address: string;
  payment_mode: string | null;
  tx_id: string | null;
  redirect_url: string | null;
  cancel_url: string | null;
  expires_at: string;
}

const Pay: FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const linkHash = searchParams.get('link');
  const navigate = useNavigate();
  const { connected, address, purchase, fulfillLinkCredits, fulfillLinkUsdcx, fulfillLinkUsad, fulfillLinkEscrow, loading: walletLoading } = useVeilWallet();

  const [session, setSession] = useState<SessionData | null>(null);
  const [linkData, setLinkData] = useState<PaymentLinkPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<PaymentPrivacy>('private');
  const [paying, setPaying] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  const isLinkMode = !!linkHash;

  // Load session or link
  useEffect(() => {
    setLoading(true);
    if (linkHash) {
      api.resolvePaymentLink(linkHash)
        .then(data => {
          setLinkData(data);
          if (!data.is_active) setError('This payment link is no longer active');
        })
        .catch(err => setError(err.message || 'Payment link not found'))
        .finally(() => setLoading(false));
    } else if (sessionId) {
      api.getPaymentSession(sessionId)
        .then(data => {
          setSession(data);
          if (data.status === 'completed') setCompleted(true);
        })
        .catch(err => setError(err.message || 'Session not found'))
        .finally(() => setLoading(false));
    } else {
      setError('No payment session or link specified');
      setLoading(false);
    }
  }, [sessionId, linkHash]);

  const isExpired = session ? new Date(session.expires_at) < new Date() : false;
  const currency = (isLinkMode ? linkData?.currency : session?.currency || 'credits') as TokenType;
  const merchantAddress = isLinkMode ? linkData?.merchant_address : session?.merchant_address;
  const displayAmount = isLinkMode
    ? (linkData?.link_type === 'open' ? (customAmount ? Math.floor(parseFloat(customAmount) * 1_000_000) : 0) : (linkData?.amount || 0))
    : (session?.amount || 0);

  const formatAmount = (amount: number) => {
    if (currency === 'usdcx') return formatUsdcx(amount);
    if (currency === 'usad') return formatUsad(amount);
    return formatCredits(amount);
  };

  // Handle payment link fulfillment
  const handlePayLink = useCallback(async () => {
    if (!linkData || !connected || !address || !merchantAddress) return;
    if (!linkData.is_active) { toast.error('Link is no longer active'); return; }

    const amount = displayAmount;
    if (amount <= 0) { toast.error('Enter a valid amount'); return; }

    setPaying(true);
    try {
      let txId: string;
      if (privacy === 'escrow' && currency === 'credits') {
        txId = await fulfillLinkEscrow(merchantAddress, amount, linkData.link_hash);
      } else if (currency === 'usdcx') {
        txId = await fulfillLinkUsdcx(merchantAddress, amount, linkData.link_hash);
      } else if (currency === 'usad') {
        txId = await fulfillLinkUsad(merchantAddress, amount, linkData.link_hash);
      } else {
        txId = await fulfillLinkCredits(merchantAddress, amount, linkData.link_hash);
      }

      // Record fulfillment in backend
      await api.fulfillPaymentLink(linkData.id, {
        link_id: linkData.id,
        purchase_commitment: `link_${linkData.id}_${Date.now()}`,
        buyer_address_hash: hashAddressSync(address),
        amount,
        tx_id: txId,
        payment_mode: privacy === 'escrow' ? 'escrow' : 'private',
      });

      setCompleted(true);
      toast.success('Payment confirmed!');
    } catch (e: any) {
      console.error('Link payment error:', e);
      toast.error(e.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  }, [linkData, connected, address, merchantAddress, displayAmount, privacy, currency, fulfillLinkCredits, fulfillLinkUsdcx, fulfillLinkUsad, fulfillLinkEscrow]);

  const handlePay = useCallback(async () => {
    if (!session || !connected || !address) return;
    if (isExpired) { toast.error('Session expired'); return; }

    // Validate constraints
    if (currency === 'usdcx' && privacy !== 'private') {
      toast.error('USDCx only supports private transfers');
      return;
    }
    if (currency === 'usad' && privacy !== 'private') {
      toast.error('USAD only supports private transfers');
      return;
    }
    if (privacy === 'escrow' && currency !== 'credits') {
      toast.error('Escrow only supports Aleo credits');
      return;
    }

    setPaying(true);
    try {
      const txId = await purchase(
        session.merchant_address,
        session.amount,
        [{ sku: 'external_order', quantity: 1 }],
        privacy,
        currency,
      );

      // Report completion to the backend
      const result = await api.completePaymentSession(session.id, {
        purchase_commitment: `session_${session.id}_${Date.now()}`,
        tx_id: txId,
        payment_mode: privacy,
        buyer_address: address,
      });

      setCompleted(true);
      toast.success('Payment confirmed!');

      // Redirect back to merchant if redirect_url is set
      if (result.redirect_url) {
        setTimeout(() => {
          window.location.href = result.redirect_url!;
        }, 2000);
      }
    } catch (e: any) {
      console.error('Payment error:', e);
      toast.error(e.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  }, [session, connected, address, privacy, currency, purchase, isExpired]);

  // Cancel handler
  const handleCancel = () => {
    if (session?.cancel_url) {
      window.location.href = session.cancel_url;
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || (!session && !linkData)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-[#1c1b1b]/40 border border-[#d4bbff]/10 rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-[#ffb4ab]/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#ffb4ab]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          <h2 className="text-xl font-semibold text-[#e5e2e1] mb-2">
            {isLinkMode ? 'Payment Link Not Found' : 'Payment Session Not Found'}
          </h2>
          <p className="text-[#c9c6c5]/70 text-sm">{error || 'This payment link is invalid or has expired.'}</p>
          <Button variant="secondary" className="mt-6" onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="w-12 h-12 rounded-full bg-sky-500/10 flex items-center justify-center mx-auto mb-3">
            <ShieldIcon size={24} className="text-sky-400" />
          </div>
          <h1 className="text-2xl font-bold text-[#e5e2e1]">VeilReceipt Checkout</h1>
          <p className="text-[#c9c6c5]/60 text-sm mt-1">Private payment powered by Aleo</p>
        </motion.div>

        {/* Payment Card */}
        <motion.div
          className="bg-[#1c1b1b]/40 border border-[#d4bbff]/10 rounded-2xl overflow-hidden backdrop-blur-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Amount */}
          <div className="p-6 border-b border-[#d4bbff]/8">
            {isLinkMode && linkData ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[#c9c6c5]/60 text-xs uppercase tracking-wider">
                    {linkData.link_type === 'one_time' ? 'One-time Payment' : linkData.link_type === 'recurring' ? 'Payment' : 'Donate'}
                  </p>
                  <Badge variant="purple">
                    {linkData.link_type === 'one_time' ? 'One-time' : linkData.link_type === 'recurring' ? 'Recurring' : 'Open'}
                  </Badge>
                </div>
                {linkData.label && (
                  <h3 className="text-lg font-semibold text-[#e5e2e1] mb-2">{linkData.label}</h3>
                )}
                <div className="flex items-center gap-3">
                  <img src={CURRENCY_LOGOS[currency] || CURRENCY_LOGOS.credits} alt={currency} className="w-8 h-8 rounded-full object-contain" />
                  {linkData.link_type === 'open' ? (
                    <span className="text-xl text-[#c9c6c5]/60">Any amount</span>
                  ) : (
                    <span className="text-3xl font-bold text-[#e5e2e1]">{formatAmount(linkData.amount)}</span>
                  )}
                  <Badge variant="info">{currency.toUpperCase()}</Badge>
                </div>
                {linkData.description && (
                  <p className="text-[#c9c6c5]/70 text-sm mt-3">{linkData.description}</p>
                )}
                {linkData.total_contributions > 0 && (
                  <p className="text-[#c9c6c5]/40 text-xs mt-2">{linkData.total_contributions} payment(s) received</p>
                )}
              </>
            ) : session ? (
              <>
                <p className="text-[#c9c6c5]/60 text-xs uppercase tracking-wider mb-2">Amount Due</p>
                <div className="flex items-center gap-3">
                  <img src={CURRENCY_LOGOS[currency] || CURRENCY_LOGOS.credits} alt={currency} className="w-8 h-8 rounded-full object-contain" />
                  <span className="text-3xl font-bold text-[#e5e2e1]">{formatAmount(session.amount)}</span>
                  <Badge variant="info">{currency.toUpperCase()}</Badge>
                </div>
                {session.description && (
                  <p className="text-[#c9c6c5]/70 text-sm mt-3">{session.description}</p>
                )}
              </>
            ) : null}
          </div>

          {completed ? (
            /* Success State */
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-[#7dffa2]/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#7dffa2]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-[#e5e2e1] mb-1">Payment Complete</h3>
              <p className="text-[#c9c6c5]/60 text-sm">Your zero-knowledge receipt has been issued.</p>
              {!isLinkMode && session?.redirect_url && (
                <p className="text-[#c9c6c5]/40 text-xs mt-4">Redirecting back to merchant...</p>
              )}
            </div>
          ) : (!isLinkMode && isExpired) ? (
            /* Expired State */
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                <ClockIcon size={32} className="text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-[#e5e2e1] mb-1">Session Expired</h3>
              <p className="text-[#c9c6c5]/60 text-sm">This payment session has expired. Please return to the merchant.</p>
              <Button variant="secondary" className="mt-4" onClick={handleCancel}>Go Back</Button>
            </div>
          ) : (
            /* Payment Form */
            <div className="p-6">
              {/* Privacy Mode */}
              <div className="mb-5">
                <p className="text-[#c9c6c5]/60 text-xs uppercase tracking-wider mb-3">Payment Mode</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'private' as const, label: 'Private', icon: <ShieldIcon size={16} />, disabled: false },
                    { value: 'public' as const, label: 'Public', icon: <PublicIcon size={16} />, disabled: currency !== 'credits' || isLinkMode },
                    { value: 'escrow' as const, label: 'Escrow', icon: <ClockIcon size={16} />, disabled: currency !== 'credits' },
                  ]).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => !opt.disabled && setPrivacy(opt.value)}
                      disabled={opt.disabled}
                      className={`p-3 rounded-xl border text-center transition-all text-sm ${
                        privacy === opt.value
                          ? 'border-sky-500/40 bg-sky-500/[0.08] text-[#e5e2e1]'
                          : opt.disabled
                          ? 'border-white/[0.03] bg-white/[0.01] text-[#c9c6c5]/25 cursor-not-allowed'
                          : 'border-[#d4bbff]/10 bg-[#1c1b1b]/30 text-[#c9c6c5]/80 hover:border-[#d4bbff]/20'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {opt.icon}
                        {opt.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ZK Notice */}
              <div className="mb-5 p-3 rounded-xl bg-sky-500/[0.04] border border-sky-500/10">
                <p className="text-sky-300/70 text-xs">
                  <ShieldIcon size={12} className="inline mr-1" />
                  {privacy === 'private'
                    ? 'Amount and identities are encrypted. Only you and the merchant see the receipt.'
                    : privacy === 'escrow'
                    ? 'Funds locked with a 500-block refund window (~8 hours).'
                    : 'Transaction amounts visible on-chain. Lower fees.'}
                </p>
              </div>

              {/* For open links: custom amount input */}
              {isLinkMode && linkData?.link_type === 'open' && (
                <div className="mb-5">
                  <label className="text-[#c9c6c5]/60 text-xs uppercase tracking-wider mb-2 block">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-4 py-3 bg-[#1c1b1b]/60 border border-[#d4bbff]/10 rounded-xl text-[#e5e2e1] placeholder:text-[#c9c6c5]/25 focus:border-sky-500/40 focus:outline-none transition-colors"
                  />
                </div>
              )}

              {/* Connect or Pay */}
              {!connected ? (
                <div className="text-center">
                  <p className="text-[#c9c6c5]/60 text-sm mb-3">Connect your Shield Wallet to pay</p>
                  <Button variant="primary" className="w-full">Connect Wallet</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={isLinkMode ? handlePayLink : handlePay}
                    disabled={paying || walletLoading || (isLinkMode && linkData?.link_type === 'open' && !customAmount)}
                  >
                    {paying ? (
                      <span className="flex items-center justify-center gap-2">
                        <LoadingSpinner /> Processing ZK Proof...
                      </span>
                    ) : (
                      `Pay ${displayAmount > 0 ? formatAmount(displayAmount) : ''}`
                    )}
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-3 bg-white/[0.01] border-t border-[#d4bbff]/5 rounded-b-2xl">
            <div className="flex items-center justify-between text-xs text-[#c9c6c5]/30">
              {isLinkMode && linkData ? (
                <>
                  <span>Link: {linkData.id.slice(0, 16)}...</span>
                  <span>{linkData.link_type}</span>
                </>
              ) : session ? (
                <>
                  <span>Session: {session.id.slice(0, 16)}...</span>
                  <span>Expires: {new Date(session.expires_at).toLocaleTimeString()}</span>
                </>
              ) : null}
            </div>
          </div>
        </motion.div>

        {/* Powered by */}
        <div className="text-center mt-6">
          <p className="text-[#c9c6c5]/25 text-xs">
            Powered by <span className="text-sky-400/50">VeilReceipt</span> — Zero-knowledge commerce on Aleo
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Pay;
