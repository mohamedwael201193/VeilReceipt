// Merchant Console page

import { FC, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useVeilWallet } from '@/hooks/useVeilWallet';
import { api } from '@/lib/api';
import { formatCredits } from '@/lib/utils';
import { Product, MerchantStats } from '@/lib/types';
import {
  StoreIcon,
  PackageIcon,
  PlusIcon,
  TrashIcon,
  TrendingIcon,
  DollarIcon,
  ReceiptIcon,
  ReturnIcon,
  RefreshIcon,
  LoadingSpinner,
} from '@/components/icons/Icons';
import { 
  Button, 
  Card, 
  Input, 
  Badge, 
  Modal, 
  EmptyState, 
  StatCard 
} from '@/components/ui/Components';
import toast from 'react-hot-toast';

const MerchantPage: FC = () => {
  const { connected, role, isAuthenticated, authenticate, isAuthenticating } = useVeilWallet();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<MerchantStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // New product form
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    sku: '',
    category: '',
  });

  // Track if we've loaded data this session
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load data when authenticated as merchant (only once)
  useEffect(() => {
    if (isAuthenticated && role === 'merchant' && !hasLoaded && !isLoading) {
      setHasLoaded(true);
      loadMerchantData();
    }
  }, [isAuthenticated, role, hasLoaded, isLoading]);

  // Reset when logged out
  useEffect(() => {
    if (!isAuthenticated || role !== 'merchant') {
      setHasLoaded(false);
    }
  }, [isAuthenticated, role]);

  const loadMerchantData = async () => {
    if (isLoading) return; // Prevent double loading
    
    setIsLoading(true);
    try {
      const [productsRes, statsRes] = await Promise.all([
        api.getMerchantProducts(),
        api.getMerchantStats(),
      ]);
      setProducts(productsRes.products);
      setStats(statsRes);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async () => {
    await authenticate('merchant');
    // Don't call loadMerchantData here - the useEffect will handle it
  };

  const handleCreateProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.sku) {
      toast.error('Name, price, and SKU are required');
      return;
    }

    const priceNum = parseFloat(newProduct.price) * 1_000_000; // Convert to microcredits
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('Invalid price');
      return;
    }

    setIsCreating(true);
    try {
      const result = await api.createProduct({
        name: newProduct.name,
        description: newProduct.description,
        price: priceNum,
        sku: newProduct.sku,
        category: newProduct.category || undefined,
      });
      
      setProducts([...products, result.product]);
      setNewProduct({ name: '', description: '', price: '', sku: '', category: '' });
      setShowCreateModal(false);
      toast.success('Product created!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create product');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Delete this product?')) return;
    
    try {
      await api.deleteProduct(productId);
      setProducts(products.filter(p => p.id !== productId));
      toast.success('Product deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    }
  };

  // Not connected state
  if (!connected) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-2xl mx-auto">
          <EmptyState
            icon={<StoreIcon size={48} />}
            title="Connect Your Wallet"
            description="Connect your Aleo wallet to access the merchant console"
          />
        </div>
      </div>
    );
  }

  // Not authenticated as merchant
  if (!isAuthenticated || role !== 'merchant') {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <StoreIcon size={64} className="text-veil-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-white mb-4">Merchant Console</h1>
            <p className="text-slate-400 mb-8">
              Authenticate as a merchant to manage products and view sales
            </p>
            <Button 
              onClick={handleAuth} 
              loading={isAuthenticating}
              size="lg"
            >
              Authenticate as Merchant
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <StoreIcon size={32} className="text-veil-400" />
              Merchant Console
            </h1>
            <p className="text-slate-400 mt-1">Manage your products and view sales</p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={loadMerchantData} disabled={isLoading}>
              <RefreshIcon size={18} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateModal(true)} icon={<PlusIcon size={18} />}>
              Add Product
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Total Sales"
              value={formatCredits(stats.totalSales) + ' ₳'}
              icon={<DollarIcon size={24} />}
            />
            <StatCard
              label="On-Chain Total"
              value={formatCredits(stats.onChainSalesTotal) + ' ₳'}
              icon={<TrendingIcon size={24} />}
            />
            <StatCard
              label="Transactions"
              value={stats.transactionCount}
              icon={<ReceiptIcon size={24} />}
            />
            <StatCard
              label="Returns"
              value={stats.returnCount}
              icon={<ReturnIcon size={24} />}
            />
          </div>
        )}

        {/* Products Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <PackageIcon size={24} className="text-receipt-400" />
            Your Products
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size={32} />
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              icon={<PackageIcon size={48} />}
              title="No Products Yet"
              description="Create your first product to start selling"
              action={
                <Button onClick={() => setShowCreateModal(true)} icon={<PlusIcon size={18} />}>
                  Add Product
                </Button>
              }
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="h-full">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-white">{product.name}</h3>
                        <p className="text-sm text-slate-400">SKU: {product.sku}</p>
                      </div>
                      <Badge variant={product.inStock ? 'success' : 'error'}>
                        {product.inStock ? 'In Stock' : 'Out of Stock'}
                      </Badge>
                    </div>
                    {product.description && (
                      <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                      <span className="text-lg font-bold text-veil-400">
                        {formatCredits(product.price)} ₳
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteProduct(product.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <TrashIcon size={16} />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Create Product Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Add New Product"
        >
          <div className="space-y-4">
            <Input
              label="Product Name *"
              placeholder="e.g., Premium Widget"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
            />
            <Input
              label="Description"
              placeholder="Brief product description"
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Price (Credits) *"
                type="number"
                step="0.01"
                placeholder="e.g., 10.00"
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
              />
              <Input
                label="SKU *"
                placeholder="e.g., PRD-001"
                value={newProduct.sku}
                onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
              />
            </div>
            <Input
              label="Category"
              placeholder="e.g., Electronics"
              value={newProduct.category}
              onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
            />
            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateProduct}
                loading={isCreating}
                className="flex-1"
              >
                Create Product
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default MerchantPage;
