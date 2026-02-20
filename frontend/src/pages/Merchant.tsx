// Merchant Page — Cosmic glassmorphism dashboard with product management and analytics

import { FC, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useVeilWallet } from '@/hooks/useVeilWallet';
import { api } from '@/lib/api';
import { Button, Card, Badge, Input, EmptyState, StatCard, Modal, PillNav, SectionHeader, Select } from '@/components/ui/Components';
import { LoadingSpinner, TokenAmount } from '@/components/icons/Icons';
import {
  StoreIcon,
  PackageIcon,
  PlusIcon,
  ChartIcon,
  ReceiptIcon,
  DollarIcon,
  TrendingIcon,
  TrashIcon,
  RefreshIcon,
  ShieldIcon,
} from '@/components/icons/Icons';
import { FloatingParticles, GridBackground, GlowOrb } from '@/components/effects/CosmicBackground';
import { truncateAddress } from '@/lib/utils';
import { formatUsdcx, formatCredits } from '@/lib/stablecoin';
import type { Product } from '@/lib/types';

type MerchantTab = 'products' | 'analytics';

const Merchant: FC = () => {
  const { connected, address, authenticate, getMerchantReceipts } = useVeilWallet();

  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [tab, setTab] = useState<MerchantTab>('products');

  // Product form
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    price_type: 'credits' as 'credits' | 'usdcx',
    sku: '',
    category: '',
  });

  const handleAuth = async () => {
    if (!connected) {
      toast.error('Connect your wallet first');
      return;
    }
    setLoading(true);
    try {
      await authenticate('merchant');
      setAuthenticated(true);
      toast.success('Authenticated as merchant');
    } catch (e: any) {
      toast.error(e.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const loadData = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    try {
      const [productsRes, statsRes, onChainReceipts] = await Promise.all([
        api.getProducts({ merchant: address || '' }).catch(() => ({ products: [] })),
        api.getMerchantStats().catch(() => null),
        getMerchantReceipts().catch(() => []),
      ]);
      setProducts(productsRes.products || []);

      // Merge backend stats with on-chain data
      const backendReceipts = statsRes?.totalReceipts ?? 0;
      const backendRevenue = statsRes?.totalRevenue ?? 0;
      const onChainCount = onChainReceipts.length;
      const onChainRevenue = onChainReceipts.reduce((sum: number, r: any) => sum + (r.total || 0), 0);

      // Split revenue by token type from on-chain records
      const creditsReceipts = onChainReceipts.filter((r: any) => r.token_type === 0);
      const usdcxReceipts = onChainReceipts.filter((r: any) => r.token_type === 1);
      const creditsRevenue = creditsReceipts.reduce((sum: number, r: any) => sum + (r.total || 0), 0);
      const usdcxRevenue = usdcxReceipts.reduce((sum: number, r: any) => sum + (r.total || 0), 0);

      setStats({
        ...statsRes,
        totalReceipts: Math.max(backendReceipts, onChainCount),
        totalRevenue: Math.max(backendRevenue, onChainRevenue),
        creditsRevenue,
        usdcxRevenue,
        onChainSales: onChainCount,
        onChainRevenue,
        // ALL on-chain merchant receipts are private (private + public purchases both produce private records)
        privateSales: statsRes?.privateSales ?? onChainReceipts.length,
        publicSales: statsRes?.publicSales ?? 0,
        escrowSales: statsRes?.escrowSales ?? 0,
        refunds: statsRes?.refunds ?? 0,
      });
    } catch (e) {
      console.error('Failed to load merchant data:', e);
    } finally {
      setLoading(false);
    }
  }, [authenticated, address, getMerchantReceipts]);

  useEffect(() => {
    if (authenticated) loadData();
  }, [authenticated, loadData]);

  const handleAddProduct = async () => {
    if (!productForm.name || !productForm.price || !productForm.sku) {
      toast.error('Name, price, and SKU are required');
      return;
    }
    setLoading(true);
    try {
      const price = Math.floor(parseFloat(productForm.price) * 1_000_000);
      await api.createProduct({
        name: productForm.name,
        description: productForm.description,
        price,
        price_type: productForm.price_type,
        sku: productForm.sku,
        category: productForm.category || undefined,
      });
      toast.success('Product added!');
      setShowAddProduct(false);
      setProductForm({ name: '', description: '', price: '', price_type: 'credits', sku: '', category: '' });
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await api.deleteProduct(id);
      toast.success('Product removed');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete');
    }
  };

  const tabItems: { id: MerchantTab; label: string; icon: any }[] = [
    { id: 'products', label: 'Products', icon: <PackageIcon size={15} /> },
    { id: 'analytics', label: 'Analytics', icon: <ChartIcon size={15} /> },
  ];

  // Not connected
  if (!connected) {
    return (
      <div className="relative min-h-screen pt-24 flex items-center justify-center">
        <GridBackground className="opacity-20" />
        <GlowOrb color="sky" size={300} className="top-1/3 left-1/2 -translate-x-1/2" />
        <div className="relative z-10">
          <EmptyState
            icon={<StoreIcon size={52} className="text-white/20" />}
            title="Connect Wallet"
            description="Connect your Aleo wallet to access the merchant dashboard."
          />
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!authenticated) {
    return (
      <div className="relative min-h-screen pt-24 flex items-center justify-center">
        <GridBackground className="opacity-20" />
        <FloatingParticles count={20} />
        <GlowOrb color="purple" size={300} className="top-1/4 left-1/2 -translate-x-1/2" />

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, type: 'spring', damping: 25 }}
          className="relative z-10 w-full max-w-md"
        >
          <Card glow className="text-center">
            {/* Animated store icon */}
            <div className="relative inline-flex mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-sky-500/20 to-purple-500/20 rounded-full blur-xl" />
              <div className="relative p-5 bg-gradient-to-br from-sky-500/10 to-purple-500/10 border border-white/[0.08] rounded-2xl">
                <StoreIcon size={36} className="text-sky-400" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Merchant Dashboard</h2>
            <p className="text-white/40 mb-6 text-sm leading-relaxed">
              Authenticate to manage products, view analytics, and accept private payments.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-full mb-6">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-white/40 font-mono">{truncateAddress(address || '')}</span>
            </div>

            <Button onClick={handleAuth} loading={loading} icon={<ShieldIcon size={18} />} variant="glow" className="w-full" size="lg">
              Sign In as Merchant
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pt-24 pb-16">
      {/* Background */}
      <GridBackground className="opacity-20" />
      <FloatingParticles count={20} />
      <div className="absolute top-20 left-0 w-[500px] h-[400px] bg-sky-500/[0.03] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-20 right-0 w-[400px] h-[300px] bg-purple-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <SectionHeader
            title="Merchant Dashboard"
            subtitle={address ? truncateAddress(address) : undefined}
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

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08 } },
          }}
        >
          {[
            { label: 'Products', value: products.length, icon: <PackageIcon size={22} /> },
            { label: 'Total Sales', value: stats?.totalReceipts ?? 0, icon: <ReceiptIcon size={22} /> },
            { label: 'Credits Revenue', value: <TokenAmount amount={stats?.creditsRevenue != null ? formatCredits(stats.creditsRevenue) : (stats?.totalRevenue ? formatCredits(stats.totalRevenue) : '0.00 ALEO')} type="credits" size="lg" />, icon: <DollarIcon size={22} /> },
            { label: 'USDCx Revenue', value: <TokenAmount amount={stats?.usdcxRevenue != null ? formatUsdcx(stats.usdcxRevenue) : '$0.00'} type="usdcx" size="lg" />, icon: <TrendingIcon size={22} /> },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
              }}
            >
              <StatCard {...stat} />
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <PillNav tabs={tabItems} active={tab} onChange={setTab} />
        </motion.div>

        {/* ========== PRODUCTS TAB ========== */}
        {tab === 'products' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Your Products</h2>
              <Button
                icon={<PlusIcon size={16} />}
                variant="glow"
                onClick={() => setShowAddProduct(true)}
              >
                Add Product
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <LoadingSpinner size={40} />
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                icon={<PackageIcon size={52} className="text-white/15" />}
                title="No Products"
                description="Add your first product to start accepting private payments."
                action={
                  <Button icon={<PlusIcon size={16} />} variant="glow" onClick={() => setShowAddProduct(true)}>
                    Add Product
                  </Button>
                }
              />
            ) : (
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.06 } },
                }}
              >
                {products.map((p) => (
                  <motion.div
                    key={p.id}
                    variants={{
                      hidden: { opacity: 0, y: 15 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                    }}
                  >
                    <Card hover>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold truncate">{p.name}</h3>
                          <p className="text-white/35 text-sm mt-1.5 line-clamp-2 leading-relaxed">{p.description}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-2 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all ml-2"
                        >
                          <TrashIcon size={15} />
                        </button>
                      </div>
                      <div className="mt-4 flex items-end justify-between pt-3 border-t border-white/[0.05]">
                        <TokenAmount
                          amount={p.price_type === 'usdcx' ? formatUsdcx(p.price) : formatCredits(p.price)}
                          type={p.price_type === 'usdcx' ? 'usdcx' : 'credits'}
                          size="lg"
                        />
                        <div className="flex items-center gap-2">
                          {p.category && <Badge variant="purple">{p.category}</Badge>}
                          <Badge variant={p.in_stock ? 'success' : 'error'} dot>
                            {p.in_stock ? 'In Stock' : 'Out'}
                          </Badge>
                        </div>
                      </div>
                      <p className="mt-2.5 text-xs text-white/15 font-mono">SKU: {p.sku}</p>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        )}

        {/* ========== ANALYTICS TAB ========== */}
        {tab === 'analytics' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card glow>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-sky-500/10 rounded-xl">
                  <ChartIcon size={20} className="text-sky-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Sales Analytics</h2>
              </div>

              {stats ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Private Sales', value: stats.privateSales ?? 0, color: 'sky' },
                      { label: 'Public Sales', value: stats.publicSales ?? 0, color: 'purple' },
                      { label: 'Escrow Sales', value: stats.escrowSales ?? 0, color: 'amber' },
                      { label: 'Refunds', value: stats.refunds ?? 0, color: 'red' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="p-5 bg-white/[0.03] border border-white/[0.06] rounded-xl"
                      >
                        <p className="text-white/30 text-xs uppercase tracking-wider">{item.label}</p>
                        <p className="text-2xl font-bold text-white mt-2">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-purple-500/[0.04] border border-purple-500/10 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldIcon size={14} className="text-purple-400" />
                      <span className="text-purple-300 text-sm font-medium">Privacy Note</span>
                    </div>
                    <p className="text-xs text-purple-300/50 leading-relaxed">
                      All buyer addresses are hashed before storage. You can see aggregate totals but individual buyer identities remain private.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-white/30">No analytics data available yet.</p>
              )}
            </Card>
          </motion.div>
        )}
      </div>

      {/* ========== ADD PRODUCT MODAL ========== */}
      <Modal
        isOpen={showAddProduct}
        onClose={() => setShowAddProduct(false)}
        title="Add New Product"
      >
        <div className="space-y-4">
          <Input
            label="Product Name"
            value={productForm.name}
            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
            placeholder="Privacy Shield Pro"
          />
          <Input
            label="Description"
            value={productForm.description}
            onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
            placeholder="Enterprise ZK privacy suite"
          />
          <Select
            label="Price Currency"
            value={productForm.price_type}
            onChange={(e) => setProductForm({ ...productForm, price_type: e.target.value as 'credits' | 'usdcx' })}
            options={[
              { value: 'credits', label: 'Aleo Credits' },
              { value: 'usdcx', label: 'USDCx Stablecoin' },
            ]}
          />
          <Input
            label={productForm.price_type === 'usdcx' ? 'Price (in USDCx, e.g. 5.00)' : 'Price (in Aleo Credits, e.g. 5.00)'}
            type="number"
            step="0.01"
            value={productForm.price}
            onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
            placeholder="5.00"
          />
          <Input
            label="SKU"
            value={productForm.sku}
            onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
            placeholder="PSP-001"
          />
          <Input
            label="Category (optional)"
            value={productForm.category}
            onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
            placeholder="Software"
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowAddProduct(false)}>Cancel</Button>
            <Button onClick={handleAddProduct} loading={loading} icon={<PlusIcon size={16} />} variant="glow">
              Add Product
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Merchant;
