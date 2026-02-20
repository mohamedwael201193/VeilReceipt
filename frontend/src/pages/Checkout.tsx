// Checkout Page — Cosmic glassmorphism product grid + cart + multi-mode purchase

import { FC, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useVeilWallet } from '@/hooks/useVeilWallet';
import { useCartStore } from '@/stores/cartStore';
import { api } from '@/lib/api';
import { Button, Badge, EmptyState, Select } from '@/components/ui/Components';
import { LoadingSpinner, TokenIcon } from '@/components/icons/Icons';
import {
  CartIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  ShieldIcon,
  PublicIcon,
  ClockIcon,
  PackageIcon,
  TagIcon,
} from '@/components/icons/Icons';
import { FloatingParticles, GridBackground } from '@/components/effects/CosmicBackground';
import { truncateAddress } from '@/lib/utils';
import { formatUsdcx, formatCredits } from '@/lib/stablecoin';
import type { Product } from '@/lib/types';
import type { PaymentPrivacy, TokenType } from '@/lib/chain';

const PRIVACY_OPTIONS = [
  { value: 'private', label: 'Private', icon: <ShieldIcon size={16} />, desc: 'Fully encrypted — amounts hidden on-chain' },
  { value: 'public', label: 'Public', icon: <PublicIcon size={16} />, desc: 'Visible on-chain — lower network fee' },
  { value: 'escrow', label: 'Escrow', icon: <ClockIcon size={16} />, desc: 'Locked with refund window protection' },
];

const TOKEN_OPTIONS = [
  { value: 'credits', label: 'Aleo Credits' },
  { value: 'usdcx', label: 'USDCx Stablecoin' },
];

const Checkout: FC = () => {
  const { connected, address, purchase, loading: walletLoading } = useVeilWallet();
  const { items, merchantAddress, tokenType, addItem, removeItem, updateQuantity, setTokenType, clearCart, getTotal, getItemCount } = useCartStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [privacy, setPrivacy] = useState<PaymentPrivacy>('private');
  const [checkingOut, setCheckingOut] = useState(false);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await api.getProducts({ inStock: true });
        setProducts(res?.products ?? []);
      } catch (e: any) {
        console.error('Failed to fetch products:', e);
        setProducts([
          { id: '1', merchant_id: 'm1', merchant_address: 'aleo1merchant_demo_address_placeholder0000000000000000000000qcyxn8', name: 'Privacy Shield Pro', description: 'Enterprise ZK privacy suite for secure transactions', price: 5000000, price_type: 'credits', sku: 'PSP-001', category: 'Software', in_stock: true, created_at: new Date().toISOString() },
          { id: '2', merchant_id: 'm1', merchant_address: 'aleo1merchant_demo_address_placeholder0000000000000000000000qcyxn8', name: 'ZK Audit Package', description: 'Smart contract security audit with formal verification', price: 15000000, price_type: 'credits', sku: 'ZKA-002', category: 'Service', in_stock: true, created_at: new Date().toISOString() },
          { id: '3', merchant_id: 'm1', merchant_address: 'aleo1merchant_demo_address_placeholder0000000000000000000000qcyxn8', name: 'Aleo Dev Toolkit', description: 'Developer tools, SDKs and utilitiy libraries', price: 2000000, price_type: 'credits', sku: 'ADT-003', category: 'Tools', in_stock: true, created_at: new Date().toISOString() },
          { id: '4', merchant_id: 'm1', merchant_address: 'aleo1merchant_demo_address_placeholder0000000000000000000000qcyxn8', name: 'Node License', description: 'Validator node annual license with SLA', price: 50000000, price_type: 'usdcx', sku: 'NL-004', category: 'License', in_stock: true, created_at: new Date().toISOString() },
        ]);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  const handleCheckout = async () => {
    if (!connected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    if (!merchantAddress) {
      toast.error('No merchant address found');
      return;
    }
    if (tokenType === 'usdcx' && privacy !== 'private') {
      toast.error('USDCx only supports private transfers');
      return;
    }
    if (privacy === 'escrow' && tokenType !== 'credits') {
      toast.error('Escrow only supports Aleo credits');
      return;
    }

    setCheckingOut(true);
    try {
      const total = getTotal();
      const cartItems = items.map(i => ({ sku: i.product.sku, quantity: i.quantity }));
      const txId = await purchase(merchantAddress, total, cartItems, privacy, tokenType);
      toast.success(`Transaction submitted: ${txId.slice(0, 12)}...`);
      clearCart();
      setShowCart(false);
    } catch (e: any) {
      console.error('Checkout error:', e);
      toast.error(e.message || 'Checkout failed');
    } finally {
      setCheckingOut(false);
    }
  };

  const formatPrice = (microcredits: number) => {
    if (tokenType === 'usdcx') return formatUsdcx(microcredits);
    return formatCredits(microcredits);
  };

  const total = getTotal();
  const itemCount = getItemCount();

  return (
    <div className="relative min-h-screen pt-24 pb-16">
      {/* Ambient background effects */}
      <GridBackground className="opacity-30" />
      <FloatingParticles count={30} />

      {/* Top gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-sky-500/[0.04] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold text-white tracking-tight">Shop</h1>
            <p className="text-white/40 mt-2 text-sm">Browse products and pay with zero-knowledge privacy</p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={() => setShowCart(!showCart)}
            className="relative p-3.5 bg-white/[0.04] backdrop-blur-xl rounded-xl border border-white/[0.08] hover:border-sky-500/30 hover:bg-white/[0.08] transition-all duration-300 group"
          >
            <CartIcon size={22} className="text-white/70 group-hover:text-white transition-colors" />
            {itemCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 bg-gradient-to-r from-sky-500 to-purple-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold shadow-lg shadow-sky-500/30"
              >
                {itemCount}
              </motion.span>
            )}
          </motion.button>
        </div>

        {/* Payment mode info bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center gap-3 mb-8 p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl text-xs text-white/35"
        >
          <span className="text-white/20 uppercase tracking-wider font-semibold">Payment Modes:</span>
          <span className="flex items-center gap-1.5"><ShieldIcon size={12} className="text-sky-400" /><span className="text-sky-400/80">Private</span> — ZK proof, untraceable</span>
          <span className="text-white/10">|</span>
          <span className="flex items-center gap-1.5"><PublicIcon size={12} className="text-white/40" /><span>Public</span> — on-chain visible</span>
          <span className="text-white/10">|</span>
          <span className="flex items-center gap-1.5"><ClockIcon size={12} className="text-amber-400" /><span className="text-amber-400/80">Escrow</span> — locked funds, refund window (Credits only)</span>
          <span className="text-white/20 ml-auto hidden sm:block">↑ Select in cart sidebar</span>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Product Grid */}
          <div className="flex-1">
            {loadingProducts ? (
              <div className="flex justify-center py-24">
                <LoadingSpinner size={40} />
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                icon={<PackageIcon size={48} />}
                title="No Products Available"
                description="Check back later or connect to a merchant's store."
              />
            ) : (
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.08 } },
                }}
              >
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAdd={() => addItem(product)}
                    formatPrice={formatPrice}
                  />
                ))}
              </motion.div>
            )}
          </div>

          {/* Cart Sidebar */}
          <AnimatePresence>
            {(showCart || itemCount > 0) && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-full lg:w-[400px] flex-shrink-0"
              >
                <div className="sticky top-24 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.07] rounded-2xl p-6 shadow-2xl shadow-sky-500/[0.03]">
                  <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-3">
                    <div className="p-2 bg-sky-500/10 rounded-lg">
                      <CartIcon size={18} className="text-sky-400" />
                    </div>
                    Cart
                    <span className="text-white/30 text-base font-normal">({itemCount})</span>
                  </h2>

                  {items.length === 0 ? (
                    <p className="text-white/30 text-sm py-6 text-center">Your cart is empty</p>
                  ) : (
                    <>
                      {/* Cart Items */}
                      <div className="space-y-3 mb-6 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                        {items.map((item) => (
                          <motion.div
                            key={item.product.id}
                            layout
                            className="flex items-center justify-between bg-white/[0.04] border border-white/[0.06] rounded-xl p-3.5"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{item.product.name}</p>
                              <p className="text-xs text-white/30 mt-0.5">{formatPrice(item.product.price)} each</p>
                            </div>
                            <div className="flex items-center gap-1.5 ml-3">
                              <button
                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                className="p-1.5 text-white/30 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all"
                              >
                                <MinusIcon size={12} />
                              </button>
                              <span className="text-white text-sm w-7 text-center font-medium">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                className="p-1.5 text-white/30 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all"
                              >
                                <PlusIcon size={12} />
                              </button>
                              <button
                                onClick={() => removeItem(item.product.id)}
                                className="p-1.5 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all ml-0.5"
                              >
                                <TrashIcon size={12} />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Payment Options */}
                      <div className="space-y-5 mb-6">
                        <Select
                          label="Payment Token"
                          value={tokenType}
                          onChange={(e) => {
                            setTokenType(e.target.value as TokenType);
                            if (e.target.value === 'usdcx') setPrivacy('private');
                          }}
                          options={TOKEN_OPTIONS}
                        />

                        {/* Privacy Mode Selector */}
                        <div className="space-y-2.5">
                          <label className="block text-sm font-medium text-white/50">
                            Privacy Mode
                            {privacy === 'escrow' && (
                              <span className="ml-2 text-amber-400/80 text-xs font-normal">— Refundable within 500 blocks</span>
                            )}
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {PRIVACY_OPTIONS.map((opt) => {
                              const disabled = (tokenType === 'usdcx' && opt.value !== 'private') ||
                                               (opt.value === 'escrow' && tokenType !== 'credits');
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => !disabled && setPrivacy(opt.value as PaymentPrivacy)}
                                  disabled={disabled}
                                  className={`relative flex flex-col items-center gap-1.5 p-3.5 rounded-xl border text-xs transition-all duration-300 ${
                                    privacy === opt.value
                                      ? 'border-sky-500/40 bg-sky-500/[0.08] text-white shadow-sm shadow-sky-500/10'
                                      : disabled
                                      ? 'border-white/[0.04] text-white/20 cursor-not-allowed'
                                      : 'border-white/[0.07] text-white/40 hover:border-white/[0.15] hover:text-white/70'
                                  }`}
                                >
                                  {privacy === opt.value && (
                                    <motion.div
                                      layoutId="privacyMode"
                                      className="absolute inset-0 border border-sky-500/30 rounded-xl bg-gradient-to-b from-sky-500/[0.06] to-transparent"
                                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                  )}
                                  <span className="relative">{opt.icon}</span>
                                  <span className="relative font-medium">{opt.label}</span>
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-xs text-white/25 mt-1.5">
                            {PRIVACY_OPTIONS.find(o => o.value === privacy)?.desc}
                          </p>
                        </div>
                      </div>

                      {/* Merchant Info */}
                      {merchantAddress && (
                        <div className="flex items-center gap-2 text-xs text-white/30 mb-4">
                          <span>Merchant:</span>
                          <span className="text-white/50 font-mono">{truncateAddress(merchantAddress)}</span>
                        </div>
                      )}

                      {/* Total & Checkout */}
                      <div className="border-t border-white/[0.06] pt-5">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-white/50 font-medium">Total</span>
                          <span className="text-2xl font-bold text-white">{formatPrice(total)}</span>
                        </div>

                        <div className="flex items-center gap-2 mb-5 flex-wrap">
                          <Badge variant={privacy === 'private' ? 'info' : privacy === 'escrow' ? 'warning' : 'default'} dot>
                            {privacy === 'private' ? 'Private' : privacy === 'escrow' ? 'Escrow' : 'Public'}
                          </Badge>
                          <Badge variant="purple" dot>
                            {tokenType === 'usdcx' ? 'USDCx' : 'Credits'}
                          </Badge>
                          {privacy === 'escrow' && (
                            <Badge variant="warning">500-block refund window</Badge>
                          )}
                        </div>

                        <Button
                          onClick={handleCheckout}
                          loading={checkingOut || walletLoading}
                          disabled={!connected || items.length === 0}
                          className="w-full"
                          size="lg"
                          variant="glow"
                          icon={<ShieldIcon size={18} />}
                        >
                          {!connected ? 'Connect Wallet' : checkingOut ? 'Processing...' : 'Pay Now'}
                        </Button>

                        {items.length > 0 && (
                          <button
                            onClick={clearCart}
                            className="w-full mt-3 text-sm text-white/25 hover:text-red-400/70 transition-colors py-2"
                          >
                            Clear Cart
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
      </div>
    </div>
  );
};

// Product Card Component
const ProductCard: FC<{
  product: Product;
  onAdd: () => void;
  formatPrice: (n: number) => string;
}> = ({ product, onAdd }) => {
  // Use product's OWN price_type for display, not the global cart selection
  const displayPrice = product.price_type === 'usdcx' ? formatUsdcx(product.price) : formatCredits(product.price);
  const isUsdcx = product.price_type === 'usdcx';

  // Generate a gradient based on category/price_type
  const iconBgGradient = isUsdcx
    ? 'from-emerald-500/20 to-teal-500/10'
    : 'from-sky-500/20 to-indigo-500/10';
  const priceGradient = isUsdcx
    ? 'from-emerald-400 via-teal-400 to-cyan-400'
    : 'from-sky-400 via-indigo-400 to-purple-400';
  const borderHover = isUsdcx
    ? 'hover:border-emerald-500/25'
    : 'hover:border-sky-500/25';
  const shadowHover = isUsdcx
    ? 'hover:shadow-emerald-500/[0.08]'
    : 'hover:shadow-sky-500/[0.08]';
  const buttonBg = isUsdcx
    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 group-hover:shadow-emerald-500/20'
    : 'bg-sky-500/10 border-sky-500/20 text-sky-400 group-hover:bg-sky-500/20 group-hover:border-sky-500/40 group-hover:shadow-sky-500/20';

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 25, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
      }}
    >
      <motion.div
        onClick={onAdd}
        whileHover={{ y: -6, scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className={`relative group cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] backdrop-blur-2xl border border-white/[0.08] ${borderHover} ${shadowHover} shadow-xl transition-all duration-500`}
      >
        {/* Ambient glow effect on hover */}
        <div className={`absolute -inset-1 bg-gradient-to-r ${isUsdcx ? 'from-emerald-500/[0.07] via-teal-500/[0.05] to-cyan-500/[0.07]' : 'from-sky-500/[0.07] via-indigo-500/[0.05] to-purple-500/[0.07]'} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl -z-10`} />

        {/* Top accent line */}
        <div className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r ${priceGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

        <div className="p-5">
          {/* Header: Category + Token badge */}
          <div className="flex items-center justify-between mb-4">
            {product.category ? (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider ${isUsdcx ? 'bg-emerald-500/[0.08] text-emerald-400 border border-emerald-500/[0.12]' : 'bg-sky-500/[0.08] text-sky-400 border border-sky-500/[0.12]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isUsdcx ? 'bg-emerald-400' : 'bg-sky-400'}`} />
                {product.category}
              </span>
            ) : <span />}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest ${isUsdcx ? 'bg-emerald-500/[0.06] text-emerald-500/60 border border-emerald-500/10' : 'bg-sky-500/[0.06] text-sky-500/60 border border-sky-500/10'}`}>
              {isUsdcx ? '$ USDCx' : '◈ ALEO'}
            </span>
          </div>

          {/* Product icon/visual area */}
          <div className="relative mb-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${iconBgGradient} border border-white/[0.06] flex items-center justify-center`}>
              <PackageIcon size={24} className={isUsdcx ? 'text-emerald-400/80' : 'text-sky-400/80'} />
            </div>
            {/* Decorative dot */}
            <div className={`absolute top-1 right-0 w-8 h-8 rounded-full bg-gradient-to-br ${iconBgGradient} blur-2xl opacity-60 group-hover:opacity-100 transition-opacity`} />
          </div>

          {/* Product Info */}
          <h3 className="text-white font-bold text-base leading-tight group-hover:text-white transition-colors duration-300 mb-1.5">
            {product.name}
          </h3>
          <p className="text-white/30 text-[13px] line-clamp-2 leading-relaxed mb-5">
            {product.description || 'Premium zero-knowledge product'}
          </p>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-4" />

          {/* Price + Add button row */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] text-white/20 uppercase tracking-widest font-medium mb-1">Price</p>
              <div className="flex items-center gap-2">
                <TokenIcon type={product.price_type === 'usdcx' ? 'usdcx' : 'credits'} size={22} />
                <p className={`text-2xl font-extrabold bg-gradient-to-r ${priceGradient} bg-clip-text text-transparent leading-none`}>
                  {displayPrice}
                </p>
              </div>
            </div>

            <motion.div
              whileHover={{ scale: 1.15, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              className={`p-3 rounded-xl border ${buttonBg} shadow-lg transition-all duration-300 cursor-pointer`}
            >
              <PlusIcon size={18} />
            </motion.div>
          </div>

          {/* SKU footer */}
          <div className="mt-4 flex items-center gap-1.5 text-[11px] text-white/15">
            <TagIcon size={10} />
            <span className="font-mono">{product.sku}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Checkout;
