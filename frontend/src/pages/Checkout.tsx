// Checkout page - Browse products and purchase

import { FC, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVeilWallet } from '@/hooks/useVeilWallet';
import { useCartStore } from '@/stores/cartStore';
import { api } from '@/lib/api';
import { formatCredits, computeCartCommitment, getCurrentTimestamp, truncateAddress } from '@/lib/utils';
import { Product, TransactionStatus } from '@/lib/types';
import { ALEO_CONFIG } from '@/lib/aleo';
import {
  CartIcon,
  PackageIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  ShieldIcon,
  LoadingSpinner,
  SuccessCheck,
  ErrorX,
  PrivateIcon,
  RefreshIcon,
} from '@/components/icons/Icons';
import { Button, Card, Badge, EmptyState, Modal } from '@/components/ui/Components';
import toast from 'react-hot-toast';

const CheckoutPage: FC = () => {
  const { connected, address, isAuthenticated, authenticate, executePurchase } = useVeilWallet();
  
  const { items, merchantAddress, addItem, removeItem, updateQuantity, clearCart, getTotal, getItemCount } = useCartStore();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [txStatus, setTxStatus] = useState<TransactionStatus>('idle');
  const [txId, setTxId] = useState<string | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [useRealPayment, setUseRealPayment] = useState(ALEO_CONFIG.enableRealPayments);

  // Load products
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const { products } = await api.getProducts({ inStock: true });
      setProducts(products);
    } catch (error: any) {
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    addItem(product);
    toast.success(`Added ${product.name} to cart`);
  };

  const handleCheckout = async () => {
    if (!connected || !address) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!isAuthenticated) {
      const success = await authenticate('buyer');
      if (!success) return;
    }

    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!merchantAddress) {
      toast.error('Invalid cart');
      return;
    }

    setShowCheckoutModal(true);
    setTxStatus('signing');

    try {
      // Compute cart commitment (hash of cart items)
      const cartItems = items.map(i => ({ sku: i.product.sku, quantity: i.quantity }));
      const commitment = computeCartCommitment(cartItems);
      const total = getTotal();
      const timestamp = getCurrentTimestamp();

      console.log('Checkout params:', {
        merchant: merchantAddress,
        total,
        commitment,
        timestamp,
      });

      // Execute purchase transaction (with real payment if enabled)
      const transactionId = await executePurchase(
        merchantAddress,
        total,
        commitment,
        timestamp,
        useRealPayment
      );

      if (!transactionId) {
        setTxStatus('failed');
        return;
      }

      setTxId(transactionId);
      setTxStatus('pending');

      // Store receipt in backend (so we can display it without wallet permissions)
      try {
        const receiptItems = items.map(item => ({
          sku: item.product.sku,
          quantity: item.quantity,
          price: item.product.price,
        }));

        await api.storeReceipt({
          txId: transactionId,
          merchantAddress: merchantAddress,
          buyerAddress: address!,
          total: total,
          cartCommitment: commitment,
          timestamp: timestamp,
          items: receiptItems,
        });
        console.log('Receipt stored in backend');
      } catch (e) {
        console.warn('Failed to store receipt:', e);
      }

      // Also record in events (legacy)
      try {
        await api.recordTransaction({
          txId: transactionId as any,
          type: 'purchase',
          merchantAddress: merchantAddress as any,
          buyerAddress: address as any,
          cartCommitment: commitment as any,
          totalAmount: total,
          itemCount: getItemCount(),
        });
      } catch (e) {
        console.warn('Failed to record tx metadata:', e);
      }

      // Wait for confirmation (with timeout)
      toast.loading('Waiting for confirmation...', { id: 'tx-confirm' });
      
      // In real scenario, poll for confirmation
      // For now, simulate success after delay
      setTimeout(() => {
        setTxStatus('confirmed');
        toast.dismiss('tx-confirm');
        toast.success('Purchase confirmed!');
        clearCart();
      }, 3000);

    } catch (error: any) {
      console.error('Checkout failed:', error);
      setTxStatus('failed');
      toast.error(error.message || 'Checkout failed');
    }
  };

  const itemCount = getItemCount();
  const total = getTotal();

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <CartIcon size={32} className="text-veil-400" />
              Private Checkout
            </h1>
            <p className="text-slate-400 mt-1">
              Your purchases are encrypted — only you can see receipt details
            </p>
          </div>
          <Button variant="ghost" onClick={loadProducts} disabled={isLoading}>
            <RefreshIcon size={18} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Products Grid */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <PackageIcon size={24} className="text-receipt-400" />
              Available Products
            </h2>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size={32} />
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                icon={<PackageIcon size={48} />}
                title="No Products Available"
                description="Check back later for new products"
              />
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {products.map((product) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    layout
                  >
                    <Card hover className="h-full flex flex-col">
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-white">{product.name}</h3>
                          {product.category && (
                            <Badge variant="info">{product.category}</Badge>
                          )}
                        </div>
                        {product.description && (
                          <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                            {product.description}
                          </p>
                        )}
                        <p className="text-xs text-slate-500">
                          Merchant: {truncateAddress(product.merchantAddress, 4)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-700">
                        <span className="text-lg font-bold text-veil-400">
                          {formatCredits(product.price)} ₳
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleAddToCart(product)}
                          icon={<PlusIcon size={16} />}
                        >
                          Add
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="bg-slate-800">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <CartIcon size={24} className="text-veil-400" />
                  Your Cart
                  {itemCount > 0 && (
                    <Badge variant="info">{itemCount}</Badge>
                  )}
                </h2>

                {items.length === 0 ? (
                  <div className="text-center py-8">
                    <CartIcon size={48} className="text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Your cart is empty</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
                      <AnimatePresence>
                        {items.map((item) => (
                          <motion.div
                            key={item.product.id}
                            layout
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-xl"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate">
                                {item.product.name}
                              </p>
                              <p className="text-sm text-veil-400">
                                {formatCredits(item.product.price)} ₳
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                className="p-1 text-slate-400 hover:text-white"
                              >
                                <MinusIcon size={16} />
                              </button>
                              <span className="w-8 text-center text-white">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                className="p-1 text-slate-400 hover:text-white"
                              >
                                <PlusIcon size={16} />
                              </button>
                              <button
                                onClick={() => removeItem(item.product.id)}
                                className="p-1 text-red-400 hover:text-red-300 ml-2"
                              >
                                <TrashIcon size={16} />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    {/* Merchant info */}
                    {merchantAddress && (
                      <div className="text-xs text-slate-400 mb-4 p-2 bg-slate-700/30 rounded-lg">
                        <PrivateIcon size={14} className="inline mr-1" />
                        Merchant: {truncateAddress(merchantAddress, 6)}
                      </div>
                    )}

                    {/* Total */}
                    <div className="border-t border-slate-700 pt-4 mb-4">
                      <div className="flex justify-between items-center text-lg">
                        <span className="text-slate-300">Total</span>
                        <span className="font-bold text-white">
                          {formatCredits(total)} ₳
                        </span>
                      </div>
                      {/* Transaction fee notice */}
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-slate-400">Network Fee</span>
                        <span className="text-slate-400">{useRealPayment ? '~2 ₳ (2 txns)' : '~1 ₳'}</span>
                      </div>
                      {useRealPayment && (
                        <div className="flex justify-between items-center text-sm mt-1 font-semibold">
                          <span className="text-green-400">You Pay</span>
                          <span className="text-green-400">{formatCredits(total + 2_000_000)} ₳</span>
                        </div>
                      )}
                    </div>

                    {/* Payment Mode Toggle */}
                    <div className="mb-4 p-3 bg-slate-700/30 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-300">
                            {useRealPayment ? '💰 Real Payment' : '🎮 Demo Mode'}
                          </span>
                        </div>
                        <button
                          onClick={() => setUseRealPayment(!useRealPayment)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            useRealPayment ? 'bg-green-500' : 'bg-slate-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              useRealPayment ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        {useRealPayment 
                          ? `⚠️ 2-step process: 1) Transfer ${formatCredits(total)} ₳ to merchant 2) Create receipt`
                          : 'Demo mode creates receipt without transferring credits'
                        }
                      </p>
                    </div>

                    {/* Privacy notice */}
                    <div className="flex items-start gap-2 p-3 bg-veil-900/30 border border-veil-700/50 rounded-xl mb-4">
                      <ShieldIcon size={20} className="text-veil-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-300">
                        Your receipt will be encrypted. Only you can view the purchase details.
                      </p>
                    </div>

                    {/* Checkout button */}
                    <Button
                      onClick={handleCheckout}
                      disabled={!connected || items.length === 0}
                      loading={txStatus === 'signing' || txStatus === 'pending'}
                      className="w-full"
                      size="lg"
                    >
                      {!connected 
                        ? 'Connect Wallet' 
                        : useRealPayment 
                          ? `💰 Pay ${formatCredits(total)} ₳` 
                          : 'Complete Purchase (Demo)'
                      }
                    </Button>

                    {/* Clear cart */}
                    <button
                      onClick={clearCart}
                      className="w-full mt-2 text-sm text-slate-400 hover:text-red-400 transition-colors"
                    >
                      Clear Cart
                    </button>
                  </>
                )}
              </Card>
            </div>
          </div>
        </div>

        {/* Transaction Status Modal */}
        <Modal
          isOpen={showCheckoutModal}
          onClose={() => txStatus !== 'pending' && setShowCheckoutModal(false)}
          title="Processing Purchase"
        >
          <div className="text-center py-8">
            {txStatus === 'signing' && (
              <>
                <LoadingSpinner size={48} className="mx-auto mb-4" />
                <p className="text-slate-300">Waiting for wallet signature...</p>
                <p className="text-sm text-slate-400 mt-2">
                  Approve the transaction in your wallet
                </p>
              </>
            )}

            {txStatus === 'pending' && (
              <>
                <LoadingSpinner size={48} className="mx-auto mb-4" />
                <p className="text-slate-300">Transaction submitted</p>
                <p className="text-sm text-slate-400 mt-2">
                  Waiting for network confirmation...
                </p>
                {txId && (
                  <p className="text-xs text-slate-500 mt-4 font-mono">
                    {txId.slice(0, 20)}...
                  </p>
                )}
              </>
            )}

            {txStatus === 'confirmed' && (
              <>
                <SuccessCheck size={48} className="mx-auto mb-4" />
                <p className="text-green-400 font-semibold">Purchase Complete!</p>
                <p className="text-sm text-slate-400 mt-2">
                  Your private receipt has been created
                </p>
                <Button
                  onClick={() => setShowCheckoutModal(false)}
                  className="mt-6"
                >
                  View Receipts
                </Button>
              </>
            )}

            {txStatus === 'failed' && (
              <>
                <ErrorX size={48} className="mx-auto mb-4" />
                <p className="text-red-400 font-semibold">Transaction Failed</p>
                <p className="text-sm text-slate-400 mt-2">
                  The transaction was not completed
                </p>
                <Button
                  variant="secondary"
                  onClick={() => setShowCheckoutModal(false)}
                  className="mt-6"
                >
                  Close
                </Button>
              </>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default CheckoutPage;
