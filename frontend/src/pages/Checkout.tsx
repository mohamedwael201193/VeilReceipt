// Checkout  Terminal Commerce encrypted shop + cart

import { FC, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useVeilWallet } from '@/hooks/useVeilWallet';
import { useCartStore } from '@/stores/cartStore';
import { api } from '@/lib/api';
import { Button, Badge, EmptyState, Select, Modal } from '@/components/ui/Components';
import { LoadingSpinner, TokenIcon } from '@/components/icons/Icons';
import {
  PlusIcon,
  MinusIcon,
  TrashIcon,
  PackageIcon,
  TagIcon,
  LoyaltyIcon,
} from '@/components/icons/Icons';
import { truncateAddress, toAleoField } from '@/lib/utils';
import { formatUsdcx, formatCredits, formatUsad } from '@/lib/stablecoin';
import { getReviewCount } from '@/lib/aleoNetwork';
import type { Product } from '@/lib/types';
import type { PaymentPrivacy, TokenType } from '@/lib/chain';

const PRIVACY_OPTIONS = [
  { value: 'private', label: 'PRIVATE', icon: 'lock', desc: 'Fully encrypted  amounts hidden on-chain' },
  { value: 'public', label: 'PUBLIC', icon: 'public', desc: 'Visible on-chain  lower network fee' },
  { value: 'escrow', label: 'ESCROW', icon: 'schedule', desc: 'Locked with 500-block refund window' },
];

const TOKEN_OPTIONS = [
  { value: 'credits', label: 'Aleo Credits' },
  { value: 'usdcx', label: 'USDCx Stablecoin' },
  { value: 'usad', label: 'USAD Stablecoin' },
];

const Checkout: FC = () => {
  const { connected, address, purchase, loading: walletLoading, getReviewTokens } = useVeilWallet();
  const { items, merchantAddress, tokenType, addItem, removeItem, updateQuantity, setTokenType, clearCart, getTotal, getItemCount } = useCartStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [privacy, setPrivacy] = useState<PaymentPrivacy>('private');
  const [checkingOut, setCheckingOut] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [reviewCounts, setReviewCounts] = useState<Record<string, number>>({});
  const [myReviews, setMyReviews] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await api.getProducts({ inStock: true });
        setProducts(res?.products ?? []);
      } catch (e: any) {
        console.error('Failed to fetch products:', e);
        setProducts([
          { id: '1', merchant_id: 'm1', merchant_address: 'aleo1merchant_demo_address_placeholder0000000000000000000000qcyxn8', name: 'Privacy Shield Pro', description: 'Enterprise ZK privacy suite', price: 5000000, price_type: 'credits', sku: 'PSP-001', category: 'Software', in_stock: true, created_at: new Date().toISOString() },
          { id: '2', merchant_id: 'm1', merchant_address: 'aleo1merchant_demo_address_placeholder0000000000000000000000qcyxn8', name: 'ZK Audit Package', description: 'Smart contract security audit', price: 15000000, price_type: 'credits', sku: 'ZKA-002', category: 'Service', in_stock: true, created_at: new Date().toISOString() },
          { id: '3', merchant_id: 'm1', merchant_address: 'aleo1merchant_demo_address_placeholder0000000000000000000000qcyxn8', name: 'Aleo Dev Toolkit', description: 'Developer tools and SDK', price: 2000000, price_type: 'credits', sku: 'ADT-003', category: 'Tools', in_stock: true, created_at: new Date().toISOString() },
          { id: '4', merchant_id: 'm1', merchant_address: 'aleo1merchant_demo_address_placeholder0000000000000000000000qcyxn8', name: 'Node License', description: 'Validator node annual license', price: 50000000, price_type: 'usdcx', sku: 'NL-004', category: 'License', in_stock: true, created_at: new Date().toISOString() },
        ]);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (products.length === 0) return;
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        products.map(async (p) => {
          const fieldKey = toAleoField(p.sku);
          const count = await getReviewCount(fieldKey);
          if (count > 0) counts[p.sku] = count;
        })
      );
      setReviewCounts(counts);
    };
    fetchCounts();
  }, [products]);

  useEffect(() => {
    if (!connected || products.length === 0) return;
    const fetchMyReviews = async () => {
      try {
        const tokens = await getReviewTokens();
        const skuFieldMap: Record<string, string> = {};
        products.forEach(p => { skuFieldMap[toAleoField(p.sku).replace(/field$/, '')] = p.sku; });
        const reviews: Record<string, number> = {};
        tokens.forEach((t: any) => {
          const hash = t.product_hash?.replace(/field$/, '');
          const sku = skuFieldMap[hash];
          if (sku) reviews[sku] = t.rating;
        });
        setMyReviews(reviews);
      } catch { /* non-critical */ }
    };
    fetchMyReviews();
  }, [connected, products, getReviewTokens]);

  const isSelfPurchase = connected && address && merchantAddress && address === merchantAddress;

  const handleCheckout = async () => {
    if (!connected || !address) { toast.error('Connect wallet first'); return; }
    if (items.length === 0) { toast.error('Cart is empty'); return; }
    if (!merchantAddress) { toast.error('No merchant address'); return; }
    if (address === merchantAddress) { toast.error('Cannot purchase own products'); return; }
    if (tokenType === 'usdcx' && privacy !== 'private') { toast.error('USDCx: private only'); return; }
    if (tokenType === 'usad' && privacy !== 'private') { toast.error('USAD: private only'); return; }
    if (privacy === 'escrow' && tokenType !== 'credits') { toast.error('Escrow: credits only'); return; }
    setConfirmModalOpen(true);
  };

  const executeCheckout = async () => {
    setConfirmModalOpen(false);
    setCheckingOut(true);
    try {
      const total = getTotal();
      const cartItems = items.map(i => ({ sku: i.product.sku, quantity: i.quantity }));
      const txId = await purchase(merchantAddress!, total, cartItems, privacy, tokenType);
      toast.success(`TX: ${txId.slice(0, 12)}...`);
      clearCart();
      setShowCart(false);
    } catch (e: any) {
      console.error('Checkout error:', e);
      const msg = e.message || 'Checkout failed';
      toast.error(msg.includes('rejected') ? 'TX rejected. Check balance.' : msg);
    } finally {
      setCheckingOut(false);
    }
  };

  const formatPrice = (microcredits: number) => {
    if (tokenType === 'usdcx') return formatUsdcx(microcredits);
    if (tokenType === 'usad') return formatUsad(microcredits);
    return formatCredits(microcredits);
  };
  const displayProductPrice = (p: Product) => {
    if (p.price_type === 'usdcx') return formatUsdcx(p.price);
    if (p.price_type === 'usad') return formatUsad(p.price);
    return formatCredits(p.price);
  };

  const total = getTotal();
  const itemCount = getItemCount();

  return (
    <div className="relative min-h-screen px-6 sm:px-8 lg:px-12 max-w-6xl mx-auto pb-16">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between mb-6 pt-4"
      >
        <div>
          <p className="text-[10px] font-mono tracking-widest text-[#7dffa2] mb-1">// DIRECTORY: ENCRYPTED_SHOP</p>
          <h1 className="text-2xl font-headline font-bold text-[#e5e2e1] uppercase tracking-tight">Product Catalog</h1>
          <p className="text-[#c9c6c5]/50 text-sm mt-1">Browse and pay with zero-knowledge privacy</p>
        </div>

        <button
          onClick={() => setShowCart(!showCart)}
          className="relative p-3 bg-[#1c1b1b] border border-[#d4bbff]/15 hover:border-[#d4bbff]/30 hover:bg-[#d4bbff]/5 transition-all"
        >
          <span className="material-symbols-outlined text-[#d4bbff]">shopping_cart</span>
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-[#7dffa2] text-[#050505] text-[10px] w-5 h-5 flex items-center justify-center font-bold font-mono">
              {itemCount}
            </span>
          )}
        </button>
      </motion.div>

      {/* Privacy modes bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="flex flex-wrap items-center gap-3 mb-8 p-3 bg-[#1c1b1b]/40 border border-[#d4bbff]/10 text-[10px] font-mono tracking-wider"
      >
        <span className="text-[#c9c6c5]/30 uppercase">MODES:</span>
        <span className="flex items-center gap-1 text-[#7dffa2]"><span className="material-symbols-outlined text-xs">lock</span> PRIVATE</span>
        <span className="text-[#c9c6c5]/15">|</span>
        <span className="flex items-center gap-1 text-[#c9c6c5]/50"><span className="material-symbols-outlined text-xs">public</span> PUBLIC</span>
        <span className="text-[#c9c6c5]/15">|</span>
        <span className="flex items-center gap-1 text-amber-400/70"><span className="material-symbols-outlined text-xs">schedule</span> ESCROW</span>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Product Grid */}
        <div className="flex-1">
          {loadingProducts ? (
            <div className="flex justify-center py-24"><LoadingSpinner size={32} /></div>
          ) : products.length === 0 ? (
            <EmptyState icon={<PackageIcon size={48} />} title="NO_PRODUCTS" description="Check back later." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.map((product, i) => {
                const isStable = product.price_type === 'usdcx' || product.price_type === 'usad';
                const rc = reviewCounts[product.sku];
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                    whileHover={{ y: -6, transition: { duration: 0.25 } }}
                    onClick={() => addItem(product)}
                    className="group cursor-pointer bg-[#1c1b1b]/40 border border-[#d4bbff]/10 hover:border-[#d4bbff]/25 hover:shadow-[0_8px_30px_rgba(212,187,255,0.06)] transition-all duration-300 p-5"
                  >
                    {/* Category + token */}
                    <div className="flex items-center justify-between mb-3">
                      {product.category && (
                        <span className={`text-[10px] font-mono tracking-widest uppercase ${isStable ? 'text-emerald-400' : 'text-[#7dffa2]'}`}>
                          {product.category}
                        </span>
                      )}
                      <span className="text-[9px] font-mono tracking-widest text-[#c9c6c5]/30 uppercase">
                        {product.price_type === 'usad' ? 'USAD' : product.price_type === 'usdcx' ? 'USDCx' : 'CREDITS'}
                      </span>
                    </div>

                    {/* Icon */}
                    <div className={`w-10 h-10 ${isStable ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-[#d4bbff]/10 border-[#d4bbff]/20'} border flex items-center justify-center mb-3`}>
                      <span className={`material-symbols-outlined text-lg ${isStable ? 'text-emerald-400' : 'text-[#d4bbff]'}`}>
                        {product.category === 'Software' ? 'security' : product.category === 'Service' ? 'verified' : product.category === 'Tools' ? 'build' : 'inventory_2'}
                      </span>
                    </div>

                    {/* Name + desc */}
                    <h3 className="text-[#e5e2e1] font-bold text-sm mb-1">{product.name}</h3>
                    <p className="text-[#c9c6c5]/40 text-xs line-clamp-2 mb-4">{product.description || 'ZK product'}</p>

                    <div className="h-px bg-[#d4bbff]/5 mb-3" />

                    {/* Price + add */}
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[9px] font-mono tracking-widest text-[#c9c6c5]/30 mb-0.5">PRICE</p>
                        <div className="flex items-center gap-1.5">
                          <TokenIcon type={product.price_type === 'usad' ? 'usad' : product.price_type === 'usdcx' ? 'usdcx' : 'credits'} size={18} />
                          <span className={`text-lg font-bold ${isStable ? 'text-emerald-400' : 'text-[#7dffa2]'}`}>{displayProductPrice(product)}</span>
                        </div>
                      </div>
                      <div className={`p-2 border ${isStable ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-[#7dffa2]/10 border-[#7dffa2]/20 text-[#7dffa2]'} group-hover:scale-110 transition-transform`}>
                        <PlusIcon size={16} />
                      </div>
                    </div>

                    {/* Reviews */}
                    {rc && rc > 0 && (
                      <div className="mt-3 flex items-center gap-1.5 text-[10px]">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <LoyaltyIcon key={s} size={10} className={s <= (myReviews[product.sku] || Math.min(4, rc)) ? 'text-yellow-400 fill-yellow-400' : 'text-[#c9c6c5]/15'} />
                          ))}
                        </div>
                        <span className="text-yellow-400/60 font-mono">{rc}</span>
                        <span className="text-[#c9c6c5]/25 font-mono">verified</span>
                      </div>
                    )}

                    {/* SKU */}
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-[#c9c6c5]/15 font-mono">
                      <TagIcon size={9} />{product.sku}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Sidebar */}
        <AnimatePresence>
          {(showCart || itemCount > 0) && (
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className="w-full lg:w-[380px] flex-shrink-0"
            >
              <div className="sticky top-24 bg-[#0a0a0a] border border-[#d4bbff]/15 p-6 shadow-[0_0_40px_rgba(212,187,255,0.04)]">
                <h2 className="text-xs font-mono tracking-widest text-[#d4bbff] mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">shopping_cart</span>
                  // CART ({itemCount})
                </h2>

                {items.length === 0 ? (
                  <p className="text-[#c9c6c5]/30 text-sm py-6 text-center font-mono">EMPTY</p>
                ) : (
                  <>
                    {/* Cart items */}
                    <div className="space-y-2 mb-5 max-h-56 overflow-y-auto terminal-scroll pr-1">
                      {items.map((item) => (
                        <div key={item.product.id} className="flex items-center justify-between bg-[#1c1b1b]/60 border border-[#d4bbff]/10 p-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#e5e2e1] truncate">{item.product.name}</p>
                            <p className="text-[10px] font-mono text-[#c9c6c5]/30">{displayProductPrice(item.product)} ea</p>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-1 text-[#c9c6c5]/30 hover:text-[#e5e2e1] hover:bg-[#1c1b1b] transition-all"><MinusIcon size={12} /></button>
                            <span className="text-[#e5e2e1] text-sm w-6 text-center font-mono">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-1 text-[#c9c6c5]/30 hover:text-[#e5e2e1] hover:bg-[#1c1b1b] transition-all"><PlusIcon size={12} /></button>
                            <button onClick={() => removeItem(item.product.id)} className="p-1 text-[#ffb4ab]/40 hover:text-[#ffb4ab] hover:bg-[#ffb4ab]/10 transition-all ml-1"><TrashIcon size={12} /></button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Payment options */}
                    <div className="space-y-4 mb-5">
                      <Select
                        label="TOKEN"
                        value={tokenType}
                        onChange={(e) => {
                          setTokenType(e.target.value as TokenType);
                          if (e.target.value === 'usdcx' || e.target.value === 'usad') setPrivacy('private');
                        }}
                        options={TOKEN_OPTIONS}
                      />

                      <div className="space-y-2">
                        <label className="block text-[10px] font-mono tracking-widest uppercase text-[#c9c6c5]">
                          PRIVACY_MODE
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {PRIVACY_OPTIONS.map((opt) => {
                            const disabled = ((tokenType === 'usdcx' || tokenType === 'usad') && opt.value !== 'private') ||
                                             (opt.value === 'escrow' && tokenType !== 'credits');
                            return (
                              <button
                                key={opt.value}
                                onClick={() => !disabled && setPrivacy(opt.value as PaymentPrivacy)}
                                disabled={disabled}
                                className={`flex flex-col items-center gap-1 p-3 border text-[10px] font-mono tracking-wider transition-all ${
                                  privacy === opt.value
                                    ? 'border-[#d4bbff]/40 bg-[#d4bbff]/10 text-[#d4bbff]'
                                    : disabled
                                    ? 'border-[#1c1b1b] text-[#c9c6c5]/20 cursor-not-allowed'
                                    : 'border-[#d4bbff]/10 text-[#c9c6c5]/50 hover:border-[#d4bbff]/25'
                                }`}
                              >
                                <span className="material-symbols-outlined text-base">{opt.icon}</span>
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[10px] font-mono text-[#c9c6c5]/30">
                          {PRIVACY_OPTIONS.find(o => o.value === privacy)?.desc}
                        </p>
                      </div>
                    </div>

                    {/* Merchant */}
                    {merchantAddress && (
                      <div className="flex items-center gap-2 text-[10px] font-mono text-[#c9c6c5]/30 mb-4">
                        MERCHANT: <span className="text-[#d4bbff]/40">{truncateAddress(merchantAddress)}</span>
                      </div>
                    )}

                    {/* Total */}
                    <div className="border-t border-[#d4bbff]/10 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-mono tracking-widest text-[#c9c6c5]">TOTAL</span>
                        <span className="text-xl font-headline font-bold text-[#e5e2e1]">{formatPrice(total)}</span>
                      </div>
                      <div className="flex gap-2 mb-4 flex-wrap">
                        <Badge variant={privacy === 'private' ? 'info' : privacy === 'escrow' ? 'warning' : 'default'} dot>{privacy.toUpperCase()}</Badge>
                        <Badge variant="purple" dot>{tokenType === 'usdcx' ? 'USDCx' : tokenType === 'usad' ? 'USAD' : 'CREDITS'}</Badge>
                      </div>
                      {isSelfPurchase && (
                        <div className="mb-3 p-3 bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 text-[10px] font-mono text-[#ffb4ab]">
                          ERROR: Self-purchase blocked by contract
                        </div>
                      )}
                      <Button onClick={handleCheckout} loading={checkingOut || walletLoading} disabled={!connected || items.length === 0 || !!isSelfPurchase} className="w-full" size="lg" variant="glow">
                        {!connected ? 'CONNECT_WALLET' : isSelfPurchase ? 'BLOCKED' : checkingOut ? 'PROCESSING...' : 'PAY_NOW'}
                      </Button>
                      {items.length > 0 && (
                        <button onClick={clearCart} className="w-full mt-2 text-[10px] font-mono tracking-widest text-[#c9c6c5]/25 hover:text-[#ffb4ab]/60 transition-colors py-2">
                          CLEAR_CART
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirm Modal */}
      <Modal isOpen={confirmModalOpen} onClose={() => setConfirmModalOpen(false)} title="CONFIRM_ORDER">
        <div className="space-y-4">
          <div className="bg-[#1c1b1b]/60 border border-[#d4bbff]/10 p-4 space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-[#c9c6c5]/60">{item.product.name} x{item.quantity}</span>
                <span className="text-[#e5e2e1] font-mono">{formatPrice(item.product.price * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-[#d4bbff]/10 pt-2 flex justify-between">
              <span className="text-[#e5e2e1] font-mono text-xs">TOTAL</span>
              <span className="text-[#e5e2e1] font-bold text-lg">{formatPrice(total)}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant={privacy === 'private' ? 'info' : privacy === 'escrow' ? 'warning' : 'default'} dot>{privacy.toUpperCase()}</Badge>
            <Badge variant="purple" dot>{tokenType === 'usdcx' ? 'USDCx' : tokenType === 'usad' ? 'USAD' : 'Credits'}</Badge>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setConfirmModalOpen(false)}>CANCEL</Button>
            <Button variant="glow" onClick={executeCheckout}>CONFIRM_PAY</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Checkout;
