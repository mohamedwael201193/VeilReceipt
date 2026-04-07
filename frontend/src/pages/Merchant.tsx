// Merchant Page — Clean dark dashboard with product management and analytics

import { FC, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useVeilWallet } from '@/hooks/useVeilWallet';
import { useUserStore } from '@/stores/userStore';
import { api } from '@/lib/api';
import { Button, Card, Badge, Input, EmptyState, StatCard, Modal, PillNav, SectionHeader, Select, CurrencySelect } from '@/components/ui/Components';
import { LoadingSpinner, TokenAmount } from '@/components/icons/Icons';
import {
  StoreIcon,
  PackageIcon,
  PlusIcon,
  ChartIcon,
  ReceiptIcon,
  DollarIcon,
  TrashIcon,
  RefreshIcon,
  ShieldIcon,
} from '@/components/icons/Icons';
import { truncateAddress } from '@/lib/utils';
import { formatUsdcx, formatCredits, formatUsad } from '@/lib/stablecoin';
import type { Product, PaymentLinkMeta } from '@/lib/types';
import QRCode from '@/components/ui/QRCode';

type MerchantTab = 'products' | 'analytics' | 'links';

const Merchant: FC = () => {
  const { connected, address, authenticate, getMerchantReceipts, registerMerchant, getMerchantLicense, createPaymentLink } = useVeilWallet();
  const { isMerchant, token } = useUserStore();

  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [tab, setTab] = useState<MerchantTab>('products');
  const [onChainRegistered, setOnChainRegistered] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  // Product form
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    price_type: 'credits' as 'credits' | 'usdcx' | 'usad',
    sku: '',
    category: '',
  });

  // Payment links
  const [paymentLinks, setPaymentLinks] = useState<PaymentLinkMeta[]>([]);
  const [showCreateLink, setShowCreateLink] = useState(false);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [linkForm, setLinkForm] = useState({
    label: '',
    description: '',
    amount: '',
    currency: 'credits' as 'credits' | 'usdcx' | 'usad',
    link_type: 'one_time' as 'one_time' | 'recurring' | 'open',
  });
  const [sseConnected, setSseConnected] = useState(false);

  // Real-time SSE connection
  useEffect(() => {
    if (!authenticated) return;
    const eventSource = api.connectEventStream((event, data) => {
      if (event === 'connected') {
        setSseConnected(true);
      } else if (event === 'link.fulfilled') {
        toast.success(`Payment received on link "${data.label}" — ${data.amount} (${data.contributions} total)`);
        loadPaymentLinks();
      } else if (event === 'link.closed') {
        toast.success(`Link "${data.label}" closed`);
        loadPaymentLinks();
      } else if (event === 'error') {
        setSseConnected(false);
      }
    });
    return () => {
      eventSource?.close();
      setSseConnected(false);
    };
  }, [authenticated]);

  // Restore auth from persisted store on mount — validate token is still valid
  useEffect(() => {
    const storedToken = api.getToken();
    if (connected && address && (isMerchant || token || storedToken)) {
      const t = storedToken || token;
      // No token at all — cannot be authenticated
      if (!t) {
        setAuthenticated(false);
        return;
      }
      // Check if JWT is expired by decoding the payload
      try {
        const payload = JSON.parse(atob(t.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          api.setToken(null);
          useUserStore.getState().setToken(null);
          setAuthenticated(false);
          return;
        }
      } catch {
        api.setToken(null);
        useUserStore.getState().setToken(null);
        setAuthenticated(false);
        return;
      }
      // Token exists and is not expired — restore session
      api.setToken(t);
      setAuthenticated(true);
      getMerchantLicense().then(license => {
        setOnChainRegistered(!!license);
      }).catch(() => {});
    }
  }, [connected, address, isMerchant, token, getMerchantLicense]);

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
      // Check on-chain registration
      const license = await getMerchantLicense();
      setOnChainRegistered(!!license);
    } catch (e: any) {
      toast.error(e.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterOnChain = async () => {
    if (!address) return;
    setRegisterLoading(true);
    try {
      // Hash the address as store name for now
      const storeNameHash = address.slice(0, 20);
      await registerMerchant(storeNameHash);
      setOnChainRegistered(true);
    } catch (e: any) {
      toast.error(e.message || 'Registration failed');
    } finally {
      setRegisterLoading(false);
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
      const usadReceipts = onChainReceipts.filter((r: any) => r.token_type === 2);
      const creditsRevenue = creditsReceipts.reduce((sum: number, r: any) => sum + (r.total || 0), 0);
      const usdcxRevenue = usdcxReceipts.reduce((sum: number, r: any) => sum + (r.total || 0), 0);
      const usadRevenue = usadReceipts.reduce((sum: number, r: any) => sum + (r.total || 0), 0);

      setStats({
        ...statsRes,
        totalReceipts: Math.max(backendReceipts, onChainCount),
        totalRevenue: Math.max(backendRevenue, onChainRevenue),
        creditsRevenue,
        usdcxRevenue,
        usadRevenue,
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

  const loadPaymentLinks = useCallback(async () => {
    try {
      const links = await api.listPaymentLinks();
      setPaymentLinks(Array.isArray(links) ? links : []);
    } catch {
      setPaymentLinks([]);
    }
  }, []);

  useEffect(() => {
    if (authenticated) loadPaymentLinks();
  }, [authenticated, loadPaymentLinks]);

  // Auto-refresh links every 15s when on links tab and reload on tab focus
  useEffect(() => {
    if (!authenticated || tab !== 'links') return;
    loadPaymentLinks();
    const interval = setInterval(loadPaymentLinks, 15000);
    const onFocus = () => loadPaymentLinks();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, [authenticated, tab, loadPaymentLinks]);

  const handleCreateLink = async () => {
    if (!linkForm.label) {
      toast.error('Label is required');
      return;
    }
    setLoading(true);
    try {
      const amount = linkForm.link_type === 'open' ? 0 : Math.floor(parseFloat(linkForm.amount || '0') * 1_000_000);
      const tokenType = linkForm.currency === 'credits' ? 0 : linkForm.currency === 'usdcx' ? 1 : 2;
      const linkTypeNum = linkForm.link_type === 'one_time' ? 0 : linkForm.link_type === 'recurring' ? 1 : 2;

      const { txId } = await createPaymentLink(amount, tokenType, linkTypeNum);

      // Generate a unique link_hash for the backend (not the on-chain BHP256 hash)
      const linkHash = `pl_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;

      // Store in backend
      await api.createPaymentLink({
        link_hash: linkHash,
        amount,
        currency: linkForm.currency,
        link_type: linkForm.link_type,
        label: linkForm.label,
        description: linkForm.description,
        tx_id: txId,
      });

      setShowCreateLink(false);
      setLinkForm({ label: '', description: '', amount: '', currency: 'credits', link_type: 'one_time' });
      loadPaymentLinks();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create payment link');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseLink = async (link: PaymentLinkMeta) => {
    try {
      // Close on backend
      await api.closePaymentLink(link.id);
      toast.success('Link closed');
      loadPaymentLinks();
    } catch (e: any) {
      toast.error(e.message || 'Failed to close link');
    }
  };

  const getPaymentLinkUrl = (link: PaymentLinkMeta): string => {
    const base = window.location.origin;
    return `${base}/pay?link=${link.link_hash}`;
  };

  const tabItems: { id: MerchantTab; label: string; icon: any }[] = [
    { id: 'products', label: 'Products', icon: <PackageIcon size={15} /> },
    { id: 'links', label: 'Payment Links', icon: <DollarIcon size={15} /> },
    { id: 'analytics', label: 'Analytics', icon: <ChartIcon size={15} /> },
  ];

  // Not connected
  if (!connected) {
    return (
      <div className="relative min-h-screen pt-4 flex items-center justify-center">
        <div className="relative z-10">
          <EmptyState
            icon={<StoreIcon size={52} className="text-[#c9c6c5]/25" />}
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
      <div className="relative min-h-screen pt-4 flex items-center justify-center">

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, type: 'spring', damping: 25 }}
          className="relative z-10 w-full max-w-md"
        >
          <Card glow className="text-center">
            {/* Animated store icon */}
            <div className="relative inline-flex mb-6">
              <div className="relative p-5 bg-[#7dffa2]/10 border border-[#d4bbff]/15 rounded-2xl">
                <StoreIcon size={36} className="text-[#7dffa2]" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-[#e5e2e1] mb-2">Merchant Dashboard</h2>
            <p className="text-[#c9c6c5]/60 mb-6 text-sm leading-relaxed">
              Authenticate to manage products, view analytics, and accept private payments.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1c1b1b]/40 border border-[#d4bbff]/10 rounded-full mb-6">
              <div className="w-2 h-2 rounded-full bg-[#7dffa2] animate-pulse" />
              <span className="text-xs text-[#c9c6c5]/60 font-mono">{truncateAddress(address || '')}</span>
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
    <div className="relative min-h-screen pt-4 pb-16">
      {/* Background */}
      <div className="absolute top-20 left-0 w-[500px] h-[400px] bg-[#7dffa2]/[0.02] rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
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

        {/* On-Chain Registration */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Card className={onChainRegistered ? 'border-[#7dffa2]/15' : 'border-amber-500/15'}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`p-2 rounded-xl ${onChainRegistered ? 'bg-[#7dffa2]/10' : 'bg-amber-500/10'}`}>
                    <ShieldIcon size={18} className={onChainRegistered ? 'text-[#7dffa2]' : 'text-amber-400'} />
                  </div>
                  <span className="text-[#e5e2e1] font-bold">On-Chain Registration</span>
                  <Badge variant={onChainRegistered ? 'success' : 'warning'} dot>
                    {onChainRegistered ? 'Registered' : 'Not Registered'}
                  </Badge>
                </div>
                <p className="text-xs text-[#c9c6c5]/60 leading-relaxed max-w-lg">
                  {onChainRegistered
                    ? 'Your merchant identity is registered on the Aleo blockchain. Customers can verify you are a legitimate seller.'
                    : 'Register your merchant identity on-chain to unlock verified seller status. This creates a MerchantLicense record in your wallet.'}
                </p>
              </div>
              {!onChainRegistered && (
                <Button
                  variant="glow"
                  onClick={handleRegisterOnChain}
                  loading={registerLoading}
                  icon={<ShieldIcon size={16} />}
                >
                  Register on Chain
                </Button>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1 } },
          }}
        >
          {[
            { label: 'Products', value: products.length, icon: <PackageIcon size={22} /> },
            { label: 'Total Sales', value: stats?.totalReceipts ?? 0, icon: <ReceiptIcon size={22} /> },
            { label: 'Credits Revenue', value: <TokenAmount amount={stats?.creditsRevenue != null ? formatCredits(stats.creditsRevenue) : (stats?.totalRevenue ? formatCredits(stats.totalRevenue) : '0.00 ALEO')} type="credits" size="lg" />, icon: <img src="/aleoicon.png" alt="Credits" className="w-6 h-6 object-contain" /> },
            { label: 'USDCx Revenue', value: <TokenAmount amount={stats?.usdcxRevenue != null ? formatUsdcx(stats.usdcxRevenue) : '$0.00'} type="usdcx" size="lg" />, icon: <img src="/usdcx.svg" alt="USDCx" className="w-6 h-6 object-contain" /> },
            { label: 'USAD Revenue', value: <TokenAmount amount={stats?.usadRevenue != null ? formatUsad(stats.usadRevenue) : '$0.00'} type="usad" size="lg" />, icon: <img src="/USAD.svg" alt="USAD" className="w-6 h-6 object-contain" /> },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              variants={{
                hidden: { opacity: 0, y: 24, scale: 0.96 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
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
              <h2 className="text-xl font-semibold text-[#e5e2e1]">Your Products</h2>
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
                  visible: { transition: { staggerChildren: 0.08 } },
                }}
              >
                {products.map((p) => (
                  <motion.div
                    key={p.id}
                    variants={{
                      hidden: { opacity: 0, y: 20, scale: 0.96 },
                      visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
                    }}
                  >
                    <Card hover>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[#e5e2e1] font-semibold truncate">{p.name}</h3>
                          <p className="text-white/35 text-sm mt-1.5 line-clamp-2 leading-relaxed">{p.description}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-2 text-[#c9c6c5]/25 hover:text-[#ffb4ab] hover:bg-[#ffb4ab]/10 rounded-lg transition-all ml-2"
                        >
                          <TrashIcon size={15} />
                        </button>
                      </div>
                      <div className="mt-4 flex items-end justify-between pt-3 border-t border-[#d4bbff]/8">
                        <TokenAmount
                          amount={p.price_type === 'usdcx' ? formatUsdcx(p.price) : p.price_type === 'usad' ? formatUsad(p.price) : formatCredits(p.price)}
                          type={p.price_type === 'usad' ? 'usad' : p.price_type === 'usdcx' ? 'usdcx' : 'credits'}
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

        {/* ========== PAYMENT LINKS TAB ========== */}
        {tab === 'links' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-[#e5e2e1]">Payment Links</h2>
                {sseConnected && (
                  <Badge variant="success" dot>Live</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  icon={<RefreshIcon size={16} />}
                  variant="ghost"
                  size="sm"
                  onClick={() => loadPaymentLinks()}
                >
                  Refresh
                </Button>
                <Button
                  icon={<PlusIcon size={16} />}
                  variant="glow"
                  onClick={() => setShowCreateLink(true)}
                >
                  Create Link
                </Button>
              </div>
            </div>

            {paymentLinks.length === 0 ? (
              <EmptyState
                icon={<DollarIcon size={52} className="text-white/15" />}
                title="No Payment Links"
                description="Create shareable payment links for one-time payments, recurring collections, or open donations."
                action={
                  <Button icon={<PlusIcon size={16} />} variant="glow" onClick={() => setShowCreateLink(true)}>
                    Create Link
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
                  visible: { transition: { staggerChildren: 0.08 } },
                }}
              >
                {paymentLinks.map((link) => {
                  const currencyLogo = link.currency === 'usdcx' ? '/usdcx.svg' : link.currency === 'usad' ? '/USAD.svg' : '/aleoicon.png';
                  return (
                  <motion.div
                    key={link.id}
                    variants={{
                      hidden: { opacity: 0, y: 20, scale: 0.96 },
                      visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
                    }}
                  >
                    <Card hover>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[#d4bbff]/8 border border-[#d4bbff]/10 flex items-center justify-center flex-shrink-0">
                            <img src={currencyLogo} alt={link.currency} className="w-5 h-5 object-contain" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[#e5e2e1] font-semibold truncate">{link.label}</h3>
                            <p className="text-white/30 text-xs mt-0.5 line-clamp-1">{link.description || 'No description'}</p>
                          </div>
                        </div>
                        <Badge variant={link.is_active ? 'success' : 'error'} dot>
                          {link.is_active ? 'Active' : 'Closed'}
                        </Badge>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <Badge variant="purple">
                          {link.link_type === 'one_time' ? 'One-time' : link.link_type === 'recurring' ? 'Recurring' : 'Open'}
                        </Badge>
                        <Badge variant="default">{link.currency.toUpperCase()}</Badge>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="p-2.5 bg-[#1c1b1b]/40 border border-[#d4bbff]/8 rounded-xl">
                          <p className="text-[#c9c6c5]/40 text-[10px] uppercase tracking-wider">Amount</p>
                          <p className="text-[#e5e2e1] font-mono text-sm mt-0.5">
                            {link.link_type === 'open' ? 'Any' : (link.amount / 1_000_000).toFixed(2)}
                          </p>
                        </div>
                        <div className="p-2.5 bg-[#1c1b1b]/40 border border-[#d4bbff]/8 rounded-xl">
                          <p className="text-[#c9c6c5]/40 text-[10px] uppercase tracking-wider">Payments</p>
                          <p className="text-[#e5e2e1] font-mono text-sm mt-0.5">{link.total_contributions}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2 pt-3 border-t border-[#d4bbff]/8">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => {
                            navigator.clipboard.writeText(getPaymentLinkUrl(link));
                            toast.success('Link copied!');
                          }}
                        >
                          Copy Link
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => setShowQR(link.id)}
                        >
                          QR Code
                        </Button>
                        {link.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-[#ffb4ab]"
                            onClick={() => handleCloseLink(link)}
                          >
                            Close
                          </Button>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                  );
                })}
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
                  <div className="p-2 bg-[#7dffa2]/10 rounded-xl">
                  <ChartIcon size={20} className="text-[#7dffa2]" />
                </div>
                <h2 className="text-xl font-bold text-[#e5e2e1]">Sales Analytics</h2>
              </div>

              {stats ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Private Sales', value: stats.privateSales ?? 0, color: 'green' },
                      { label: 'Public Sales', value: stats.publicSales ?? 0, color: 'white' },
                      { label: 'Escrow Sales', value: stats.escrowSales ?? 0, color: 'amber' },
                      { label: 'Refunds', value: stats.refunds ?? 0, color: 'red' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="p-5 bg-[#1c1b1b]/40 border border-[#d4bbff]/10 rounded-xl"
                      >
                        <p className="text-[#c9c6c5]/40 text-xs uppercase tracking-wider">{item.label}</p>
                        <p className="text-2xl font-bold text-[#e5e2e1] mt-2">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-[#7dffa2]/[0.04] border border-[#7dffa2]/10 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldIcon size={14} className="text-[#7dffa2]" />
                      <span className="text-green-300 text-sm font-medium">Privacy Note</span>
                    </div>
                    <p className="text-xs text-green-300/50 leading-relaxed">
                      All buyer addresses are hashed before storage. You can see aggregate totals but individual buyer identities remain private.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-[#c9c6c5]/40">No analytics data available yet.</p>
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
          <CurrencySelect
            label="Price Currency"
            value={productForm.price_type}
            onChange={(val) => setProductForm({ ...productForm, price_type: val as 'credits' | 'usdcx' | 'usad' })}
          />
          <Input
            label={productForm.price_type === 'usdcx' ? 'Price (in USDCx, e.g. 5.00)' : productForm.price_type === 'usad' ? 'Price (in USAD, e.g. 5.00)' : 'Price (in Aleo Credits, e.g. 5.00)'}
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

      {/* ========== CREATE PAYMENT LINK MODAL ========== */}
      <Modal
        isOpen={showCreateLink}
        onClose={() => setShowCreateLink(false)}
        title="Create Payment Link"
      >
        <div className="space-y-4">
          <Input
            label="Label"
            value={linkForm.label}
            onChange={(e) => setLinkForm({ ...linkForm, label: e.target.value })}
            placeholder="Coffee Payment"
          />
          <Input
            label="Description (optional)"
            value={linkForm.description}
            onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })}
            placeholder="Pay for your morning coffee"
          />
          <Select
            label="Link Type"
            value={linkForm.link_type}
            onChange={(e) => setLinkForm({ ...linkForm, link_type: e.target.value as 'one_time' | 'recurring' | 'open' })}
            options={[
              { value: 'one_time', label: 'One-time — Closes after single payment' },
              { value: 'recurring', label: 'Recurring — Accepts multiple payments' },
              { value: 'open', label: 'Open — Any amount, any token' },
            ]}
          />
          <CurrencySelect
            label="Currency"
            value={linkForm.currency}
            onChange={(val) => setLinkForm({ ...linkForm, currency: val as 'credits' | 'usdcx' | 'usad' })}
          />
          {linkForm.link_type !== 'open' && (
            <Input
              label={`Amount (in ${linkForm.currency === 'credits' ? 'ALEO' : linkForm.currency.toUpperCase()})`}
              type="number"
              step="0.01"
              value={linkForm.amount}
              onChange={(e) => setLinkForm({ ...linkForm, amount: e.target.value })}
              placeholder="5.00"
            />
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowCreateLink(false)}>Cancel</Button>
            <Button onClick={handleCreateLink} loading={loading} icon={<PlusIcon size={16} />} variant="glow">
              Create Link
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========== QR CODE MODAL ========== */}
      <Modal
        isOpen={!!showQR}
        onClose={() => setShowQR(null)}
        title="Payment Link QR Code"
      >
        {showQR && (() => {
          const link = paymentLinks.find(l => l.id === showQR);
          if (!link) return null;
          const url = getPaymentLinkUrl(link);
          return (
            <div className="flex flex-col items-center gap-4">
              <QRCode value={url} size={220} />
              <p className="text-[#e5e2e1] font-semibold">{link.label}</p>
              <p className="text-[#c9c6c5]/50 text-xs text-center break-all font-mono">{url}</p>
              <Button
                variant="glow"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(url);
                  toast.success('Link copied!');
                }}
              >
                Copy Link
              </Button>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default Merchant;
