// Custom hook for wallet interactions
// Wraps the Aleo wallet adapter with VeilReceipt-specific logic

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWallet } from '@/components/providers/WalletProvider';
import { useUserStore } from '@/stores/userStore';
import { api } from '@/lib/api';
import { ALEO_CONFIG, DEFAULT_FEE } from '@/lib/aleo';
import { AleoAddress, ReceiptRecord } from '@/lib/types';
import toast from 'react-hot-toast';

// Extend wallet type for Aleo-specific methods (provablehq adapter)
interface AleoWalletExtended {
  publicKey?: string | null;
  address?: string | null;
  connected?: boolean;
  connecting?: boolean;
  signMessage?: (message: Uint8Array | string) => Promise<Uint8Array | undefined>;
  executeTransaction?: (options: any) => Promise<{ transactionId: string } | undefined>;
  requestRecords?: (program: string, includePlaintext?: boolean) => Promise<unknown[]>;
  disconnect?: () => Promise<void>;
  connect?: (network: string) => Promise<void>;
  adapter?: any;
  network?: string | null;
}

// Debug logging - enable for debugging
const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[VeilWallet]', ...args);

export function useVeilWallet() {
  const walletBase = useWallet();
  // Cast to extended type to access Aleo-specific methods
  const wallet = walletBase as unknown as AleoWalletExtended;
  const { setAccount, setAuth, clearUser, address: storeAddress, role, token } = useUserStore();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false);

  // Use refs to prevent multiple calls
  const fetchingRef = useRef(false);
  const authenticatingRef = useRef(false);

  // Restore API token from persisted state on mount
  useEffect(() => {
    if (token) {
      log('Restoring persisted API token');
      api.setToken(token);
    }
  }, []); // Run once on mount

  // Get the actual public key/address from wallet
  // Note: @provablehq adapter uses 'address' not 'publicKey'
  const walletAddress = useMemo(() => {
    const walletAny = wallet as any;
    
    // The @provablehq adapter uses 'address' property
    let addr = walletAny.address;
    
    // Fallback to publicKey if available
    if (!addr) {
      addr = wallet.publicKey || walletAny.adapter?.publicKey;
    }
    
    // Try from connected wallet adapter
    if (!addr && walletAny.wallet?.adapter?.publicKey) {
      addr = walletAny.wallet.adapter.publicKey;
    }
    
    log('Address resolution:', { 
      address: walletAny.address,
      publicKey: wallet.publicKey, 
      resolved: addr 
    });
    
    return addr as string | null;
  }, [wallet, (wallet as any).address, wallet.publicKey]);

  // Get connection status
  const isConnected = useMemo(() => {
    const walletAny = wallet as any;
    const connected = wallet.connected || walletAny.wallet?.adapter?.connected || !!walletAddress;
    log('Connection check:', { 
      walletConnected: wallet.connected, 
      hasAddress: !!walletAddress, 
      result: connected 
    });
    return connected;
  }, [wallet.connected, wallet, walletAddress]);

  // Track if wallet is still initializing
  const [walletInitialized, setWalletInitialized] = useState(false);

  // Mark wallet as initialized after a delay (allow auto-connect to complete)
  useEffect(() => {
    const timer = setTimeout(() => {
      setWalletInitialized(true);
    }, 2000); // Give wallet 2 seconds to auto-connect
    return () => clearTimeout(timer);
  }, []);

  // Sync wallet state to user store
  useEffect(() => {
    const addr = walletAddress as AleoAddress | null;
    
    log('Syncing wallet state:', { walletAddress: addr, isConnected });
    setAccount(addr, isConnected);

    // Only clear auth when wallet explicitly disconnects (after initialization period)
    // Don't clear during initial page load when wallet is still connecting
    if (walletInitialized && !isConnected && token) {
      log('Wallet disconnected, clearing auth');
      clearUser();
      api.setToken(null);
    }
  }, [walletAddress, isConnected, setAccount, clearUser, token, walletInitialized]);

  /**
   * Authenticate with backend using wallet signature
   */
  const authenticate = useCallback(async (authRole: 'merchant' | 'buyer') => {
    // Prevent multiple simultaneous authentication attempts using ref
    if (authenticatingRef.current) {
      log('Already authenticating, skipping');
      return false;
    }

    log('Authenticate called with role:', authRole);

    // Check wallet connection - use our computed walletAddress
    if (!walletAddress) {
      toast.error('Please connect your wallet first');
      return false;
    }

    authenticatingRef.current = true;
    setIsAuthenticating(true);

    // Check if signMessage is available
    if (!wallet.signMessage) {
      // Try to authenticate without signature for demo purposes
      log('signMessage not available, using mock authentication');
      
      try {
        // For demo: create a mock auth token
        const mockToken = `demo_${authRole}_${Date.now()}`;
        setAuth(mockToken, authRole);
        toast.success(`Authenticated as ${authRole} (demo mode)`);
        return true;
      } catch (error: any) {
        console.error('Demo auth failed:', error);
        toast.error('Authentication failed');
        return false;
      } finally {
        authenticatingRef.current = false;
        setIsAuthenticating(false);
      }
    }

    try {
      // Step 1: Get nonce from backend
      const { nonce, message } = await api.getNonce(walletAddress);

      // Step 2: Sign the message with wallet
      const encoder = new TextEncoder();
      const messageBytes = encoder.encode(message);
      const signatureBytes = await wallet.signMessage(messageBytes);
      const decoder = new TextDecoder();
      const signature = decoder.decode(signatureBytes);

      // Step 3: Verify signature and get JWT
      const result = await api.verifySignature(
        walletAddress,
        nonce,
        signature,
        authRole
      );

      setAuth(result.token, authRole);
      toast.success(`Authenticated as ${authRole}`);
      return true;
    } catch (error: any) {
      console.error('Authentication failed:', error);
      toast.error(error.message || 'Authentication failed');
      return false;
    } finally {
      authenticatingRef.current = false;
      setIsAuthenticating(false);
    }
  }, [walletAddress, wallet.signMessage, setAuth]);

  /**
   * Disconnect wallet and clear state
   */
  const disconnect = useCallback(async () => {
    // Reset refs on disconnect
    fetchingRef.current = false;
    authenticatingRef.current = false;
    
    try {
      if (wallet.disconnect) {
        await wallet.disconnect();
      }
      clearUser();
      api.setToken(null);
      toast.success('Disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }, [wallet, clearUser]);

  /**
   * Fetch receipts from wallet (actual on-chain records)
   * These are needed for contract operations like returns, loyalty claims, and support proofs
   */
  const fetchReceipts = useCallback(async (force = false) => {
    // Prevent multiple simultaneous fetches using ref
    if (fetchingRef.current && !force) {
      log('Already fetching receipts, skipping');
      return receipts;
    }

    if (!walletAddress) {
      log('No wallet address, cannot fetch receipts');
      return [];
    }

    fetchingRef.current = true;
    setIsLoadingReceipts(true);

    try {
      const walletAny = wallet as any;
      
      // Strategy 1: Try wallet requestRecords FIRST (needed for contract operations)
      // This gives us actual on-chain records that can be used for returns, loyalty, etc.
      if (wallet.requestRecords || walletAny.requestRecords) {
        log('Fetching records from wallet for program:', ALEO_CONFIG.programId);
        
        try {
          const requestRecordsFn = wallet.requestRecords || walletAny.requestRecords;
          // Request with plaintext = true to get full record data
          const response = await requestRecordsFn(ALEO_CONFIG.programId, true);
          
          log('Wallet records response:', response);
          
          // Handle different response formats
          let records: any[] = [];
          if (Array.isArray(response)) {
            records = response;
          } else if (response?.records) {
            records = response.records;
          } else if (response?.data) {
            records = response.data;
          }
          
          log('Raw records from wallet:', records);
          
          // Log the structure of the first record to understand the format
          if (records.length > 0) {
            log('First record FULL STRUCTURE:', JSON.stringify(records[0], null, 2));
            log('First record ALL KEYS:', Object.keys(records[0]));
            log('First record plaintext property:', records[0].plaintext);
            log('First record nonce property:', records[0].nonce);
            log('First record _nonce property:', records[0]._nonce);
          }
          
          if (records.length > 0) {
            // Filter for Receipt records (non-spent)
            const receiptRecords = records
              .filter((r: any) => {
                const isSpent = r.spent === true;
                // Check if this looks like a Receipt record
                const data = r.data || r.plaintext || r;
                const hasRequiredFields = data?.merchant || data?.total;
                log('Record filter check:', { isSpent, hasRequiredFields, data });
                return !isSpent && hasRequiredFields;
              })
              .map((r: any) => {
                const data = r.data || r.plaintext || r;
                log('Processing record:', r);
                log('Record data field:', r.data);
                log('Record full structure:', JSON.stringify(r, null, 2));
                
                // Store the original record/plaintext for contract calls
                // The wallet needs this exact format when executing transactions
                return {
                  owner: data.owner?.replace(/\.private$/, '') || walletAddress,
                  merchant: data.merchant?.replace(/\.private$/, '').replace(/\.public$/, ''),
                  total: BigInt(String(data.total || '0').replace(/u64(\.private|\.public)?$/, '')),
                  cart_commitment: data.cart_commitment?.replace(/\.private$/, '') || '0field',
                  timestamp: BigInt(String(data.timestamp || '0').replace(/u64(\.private|\.public)?$/, '')),
                  nonce_seed: data.nonce_seed?.replace(/\.private$/, ''),
                  // Use record id as unique identifier for UI
                  _nonce: r.id || r._nonce || r.nonce || `${Date.now()}_${Math.random()}`,
                  // Store the RAW record - this is what we pass to contract calls
                  _raw: r,
                  // Store plaintext string if available (for contract input)
                  _plaintext: r.plaintext || null,
                  // Store ciphertext if available
                  _ciphertext: r.ciphertext || null,
                  // Mark as wallet record (can be used for contract calls)
                  _fromWallet: true,
                };
              });

            if (receiptRecords.length > 0) {
              log('Parsed wallet receipts:', receiptRecords);
              setReceipts(receiptRecords as any);
              toast.success(`Found ${receiptRecords.length} receipt(s) from wallet`);
              return receiptRecords;
            }
          }
        } catch (walletError: any) {
          // Log the specific error
          if (walletError.message?.includes('NOT_GRANTED')) {
            log('Wallet NOT_GRANTED - need to reconnect wallet with record permissions');
            toast.error('Please disconnect and reconnect wallet to grant record access');
          } else {
            console.error('Wallet requestRecords failed:', walletError);
          }
        }
      }

      // Strategy 2: Fetch from backend (for display only - cannot use for contract calls)
      log('Fetching receipts from backend for display:', walletAddress);
      
      try {
        const backendReceipts = await api.getReceiptsByBuyer(walletAddress);
        log('Backend receipts response:', backendReceipts);
        
        if (backendReceipts.receipts && backendReceipts.receipts.length > 0) {
          // Convert backend format to our ReceiptRecord format
          // Mark as NOT from wallet (cannot use for contract calls)
          const receiptRecords = backendReceipts.receipts.map((r: any) => ({
            owner: r.buyerAddress || walletAddress,
            merchant: r.merchantAddress,
            total: BigInt(r.total || 0),
            cart_commitment: r.cartCommitment || `${r.total}field`,
            timestamp: BigInt(r.timestamp || Date.now()),
            nonce_seed: r.txId,
            _nonce: r.txId,
            _raw: r,
            // Extra fields from backend
            txId: r.txId,
            onChainTxId: r.onChainTxId,
            blockHeight: r.blockHeight,
            items: r.items,
            status: r.status,
            // Mark as NOT from wallet - cannot be used for contract calls
            _fromWallet: false,
          }));

          log('Parsed backend receipts (display only):', receiptRecords);
          setReceipts(receiptRecords as any);
          toast.success(`Found ${receiptRecords.length} receipt(s)`);
          return receiptRecords;
        }
      } catch (backendError) {
        log('Backend fetch failed:', backendError);
      }

      // No receipts found from either source
      log('No receipts found');
      setReceipts([]);
      return [];
    } catch (error) {
      console.error('Error fetching receipts:', error);
      toast.error('Failed to fetch receipts');
      return [];
    } finally {
      fetchingRef.current = false;
      setIsLoadingReceipts(false);
    }
  }, [wallet, walletAddress, receipts]);

  /**
   * Execute a REAL purchase with credits transfer
   * Two-transaction flow:
   * 1. Transfer credits to merchant via credits.aleo/transfer_public
   * 2. Create receipt via veilreceipt_v2.aleo/purchase
   * 
   * This is the correct approach because cross-program calls use caller (program) not signer (user)
   */
  const executePurchase = useCallback(async (
    merchantAddress: string,
    totalMicrocredits: number,
    cartCommitment: string,
    timestamp: number,
    useRealPayment: boolean = ALEO_CONFIG.enableRealPayments
  ): Promise<string | null> => {
    const walletAny = wallet as any;
    
    if (!walletAny.executeTransaction) {
      log('executeTransaction not available on wallet:', Object.keys(walletAny));
      toast.error('Wallet does not support transactions');
      return null;
    }

    if (!walletAddress) {
      toast.error('Wallet not connected');
      return null;
    }

    if (merchantAddress === walletAddress) {
      toast.error('Cannot buy from yourself! Use a different wallet for testing.');
      return null;
    }

    log(`Starting ${useRealPayment ? '💰 REAL PAYMENT' : '🎮 Demo'} purchase flow`);

    // ========== STEP 1: Transfer credits to merchant (if real payment) ==========
    if (useRealPayment) {
      toast.loading(`💰 Step 1/2: Transferring ${totalMicrocredits / 1_000_000} credits to merchant...`, { id: 'tx-transfer' });
      
      const transferTx = {
        program: 'credits.aleo',
        function: 'transfer_public',
        inputs: [
          merchantAddress,
          `${totalMicrocredits}u64`,
        ],
        fee: DEFAULT_FEE,
        privateFee: false,
      };

      log('Executing credits transfer:', transferTx);

      try {
        const transferResponse = await walletAny.executeTransaction(transferTx);
        toast.dismiss('tx-transfer');

        if (!transferResponse?.transactionId) {
          toast.error('Credit transfer failed - no transaction ID');
          return null;
        }

        log('Credits transfer successful:', transferResponse.transactionId);
        toast.success(`💰 ${totalMicrocredits / 1_000_000} credits transferred!`);
        
        // Small delay to let the network process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error: any) {
        toast.dismiss('tx-transfer');
        console.error('Credits transfer failed:', error);
        
        if (error.message?.includes('reject') || error.message?.includes('denied') || error.message?.includes('cancel')) {
          toast.error('Transfer cancelled');
        } else if (error.message?.includes('insufficient') || error.message?.includes('balance')) {
          toast.error(`Insufficient balance! Need ${totalMicrocredits / 1_000_000} credits + fee`);
        } else {
          toast.error(error.message || 'Transfer failed');
        }
        return null;
      }
    }

    // ========== STEP 2: Create receipt ==========
    const stepLabel = useRealPayment ? 'Step 2/2: Creating receipt...' : 'Creating receipt...';
    toast.loading(stepLabel, { id: 'tx-receipt' });

    const receiptTx = {
      program: ALEO_CONFIG.programId,
      function: 'purchase', // Always use 'purchase' for receipt creation
      inputs: [
        merchantAddress,
        `${totalMicrocredits}u64`,
        cartCommitment,
        `${timestamp}u64`,
      ],
      fee: DEFAULT_FEE,
      privateFee: false,
    };

    log('Creating receipt:', receiptTx);

    try {
      const response = await walletAny.executeTransaction(receiptTx);
      toast.dismiss('tx-receipt');

      log('Receipt creation response:', response);
      
      if (response?.transactionId) {
        const successMsg = useRealPayment
          ? '🎉 Purchase complete! Payment sent & receipt created!'
          : '✅ Receipt created!';
        toast.success(successMsg);
        return response.transactionId;
      } else {
        toast.error('Receipt creation failed - no transaction ID');
        return null;
      }
    } catch (error: any) {
      toast.dismiss('tx-receipt');
      console.error('Receipt creation failed:', error);
      
      if (error.message?.includes('reject') || error.message?.includes('denied') || error.message?.includes('cancel')) {
        toast.error('Transaction cancelled');
      } else {
        toast.error(error.message || 'Transaction failed');
      }
      return null;
    }
  }, [wallet, walletAddress]);

  /**
   * Execute a return transaction
   * Calls veilreceipt_v2.aleo::open_return (consumes receipt)
   */
  const executeReturn = useCallback(async (
    receiptRecord: any, // Raw record from wallet
    returnReasonHash: string
  ): Promise<string | null> => {
    const walletAny = wallet as any;
    
    if (!walletAny.executeTransaction) {
      toast.error('Wallet does not support transactions');
      return null;
    }

    if (!walletAddress) {
      toast.error('Wallet not connected');
      return null;
    }

    // Check if this is a wallet record (needed for contract calls)
    if (!receiptRecord._fromWallet) {
      toast.error('Cannot process return: Receipt not from wallet. Please reconnect wallet to grant record access.');
      return null;
    }

    // Get the raw record from wallet
    const rawRecord = receiptRecord._raw;
    
    log('Raw record for return:', rawRecord);
    log('Raw record ALL KEYS:', Object.keys(rawRecord || {}));
    log('Raw record plaintext property:', rawRecord?.plaintext);
    log('Raw record ciphertext property:', rawRecord?.ciphertext);
    
    // The plaintext from wallet is a string representation of the record
    if (!rawRecord?.plaintext) {
      toast.error('Record plaintext not available. Please try again.');
      return null;
    }

    // Try using ciphertext if available (some wallets prefer this)
    // Otherwise use the plaintext
    let recordInput: string;
    
    if (rawRecord.ciphertext) {
      // Use ciphertext format - wallet will decrypt and use
      recordInput = rawRecord.ciphertext;
      log('Using ciphertext for record input:', recordInput);
    } else {
      // Use plaintext - ensure proper formatting
      recordInput = rawRecord.plaintext;
      log('Using plaintext for record input:', recordInput);
    }
    
    const txOptions = {
      program: ALEO_CONFIG.programId,
      function: 'open_return',
      inputs: [
        recordInput,
        returnReasonHash,
      ],
      fee: DEFAULT_FEE,
    };
    
    log('Submitting return transaction:', txOptions);
    toast.loading('Processing return...', { id: 'tx-wallet' });
    
    try {
      const response = await walletAny.executeTransaction(txOptions);
      toast.dismiss('tx-wallet');
      log('Return transaction response:', response);
      if (response?.transactionId) {
        toast.success('Return submitted!');
        return response.transactionId;
      } else {
        toast.error('Return failed - no transaction ID');
        return null;
      }
    } catch (error: any) {
      toast.dismiss('tx-wallet');
      log('Return transaction failed:', error);
      console.error('Return failed:', error);
      
      // Provide better error messages based on error type
      const errMsg = error.message || '';
      
      if (errMsg.includes('nullifier') || errMsg.includes('already')) {
        toast.error('This receipt has already been used for a return');
      } else if (errMsg.includes('reject') || errMsg.includes('cancel') || errMsg.includes('denied')) {
        toast.error('Transaction cancelled');
      } else if (errMsg.includes('INVALID_PARAMS') || errMsg.includes('not a valid record')) {
        // This could mean:
        // 1. Record was already spent (consumed by another transaction)
        // 2. Record format doesn't match what the contract expects
        toast.error('This may occur if the nullifier was already used');
      } else if (errMsg.includes('Unspent record not found') || errMsg.includes('spent')) {
        toast.error('Receipt already spent. It may have been used for a return or loyalty claim.');
      } else {
        toast.error(error.message || 'Return failed');
      }
      return null;
    }
  }, [wallet, walletAddress]);

  /**
   * Execute a loyalty claim transaction
   * Calls veilreceipt_v2.aleo::claim_loyalty (consumes receipt)
   */
  const executeLoyaltyClaim = useCallback(async (
    receiptRecord: any,
    tier: number
  ): Promise<string | null> => {
    const walletAny = wallet as any;
    
    if (!walletAny.executeTransaction) {
      toast.error('Wallet does not support transactions');
      return null;
    }

    if (!walletAddress) {
      toast.error('Wallet not connected');
      return null;
    }

    // Check if this is a wallet record (needed for contract calls)
    if (!receiptRecord._fromWallet) {
      toast.error('Cannot claim loyalty: Receipt not from wallet. Please reconnect wallet to grant record access.');
      return null;
    }

    // Get the raw record from wallet
    const rawRecord = receiptRecord._raw;
    
    log('Raw record for loyalty:', rawRecord);
    log('Raw record plaintext:', rawRecord?.plaintext);
    
    // Use the plaintext property directly if available
    if (!rawRecord?.plaintext) {
      toast.error('Record plaintext not available. Please try again.');
      return null;
    }

    const txOptions = {
      program: ALEO_CONFIG.programId,
      function: 'claim_loyalty',
      inputs: [
        rawRecord.plaintext,
        `${tier}u8`,
      ],
      fee: DEFAULT_FEE,
    };

    log('Submitting loyalty claim:', txOptions);
    toast.loading('Waiting for wallet confirmation...', { id: 'tx-wallet' });

    try {
      const response = await walletAny.executeTransaction(txOptions);
      toast.dismiss('tx-wallet');

      log('Loyalty claim response:', response);
      
      if (response?.transactionId) {
        toast.success('Loyalty claim submitted!');
        return response.transactionId;
      } else {
        toast.error('Loyalty claim failed - no transaction ID');
        return null;
      }
    } catch (error: any) {
      toast.dismiss('tx-wallet');
      console.error('Loyalty claim failed:', error);
      
      if (error.message?.includes('Unspent record not found')) {
        toast.error('Record not found in wallet. Please reconnect wallet and try again.');
      } else if (error.message?.includes('nullifier') || error.message?.includes('already')) {
        toast.error('Loyalty already claimed for this receipt');
      } else if (error.message?.includes('reject') || error.message?.includes('cancel')) {
        toast.error('Transaction cancelled');
      } else {
        toast.error(error.message || 'Claim failed');
      }
      return null;
    }
  }, [wallet, walletAddress]);

  /**
   * Generate support proof token (non-consuming)
   * Calls veilreceipt_v2.aleo::prove_purchase_for_support
   */
  const generateSupportProof = useCallback(async (
    receiptRecord: any,
    productHash: string,
    salt: string
  ): Promise<string | null> => {
    const walletAny = wallet as any;
    
    if (!walletAny.executeTransaction) {
      toast.error('Wallet does not support transactions');
      return null;
    }

    if (!walletAddress) {
      toast.error('Wallet not connected');
      return null;
    }

    // Check if this is a wallet record (needed for contract calls)
    if (!receiptRecord._fromWallet) {
      toast.error('Cannot generate proof: Receipt not from wallet. Please reconnect wallet to grant record access.');
      return null;
    }

    // Get the raw record from wallet
    const rawRecord = receiptRecord._raw;
    
    log('Raw record for support proof:', rawRecord);
    log('Raw record plaintext:', rawRecord?.plaintext);
    
    // Use the plaintext property directly if available
    if (!rawRecord?.plaintext) {
      toast.error('Record plaintext not available. Please try again.');
      return null;
    }

    const txOptions = {
      program: ALEO_CONFIG.programId,
      function: 'prove_purchase_for_support',
      inputs: [
        rawRecord.plaintext,
        productHash,
        salt,
      ],
      fee: DEFAULT_FEE,
    };

    log('Generating support proof:', txOptions);
    toast.loading('Generating proof...', { id: 'tx-wallet' });

    try {
      const response = await walletAny.executeTransaction(txOptions);
      toast.dismiss('tx-wallet');

      log('Support proof response:', response);
      
      if (response?.transactionId) {
        toast.success('Proof generated!');
        return response.transactionId;
      } else {
        toast.error('Failed to generate proof - no transaction ID');
        return null;
      }
    } catch (error: any) {
      toast.dismiss('tx-wallet');
      console.error('Support proof failed:', error);
      
      if (error.message?.includes('Unspent record not found')) {
        toast.error('Record not found in wallet. Please reconnect wallet and try again.');
      } else if (error.message?.includes('reject') || error.message?.includes('cancel')) {
        toast.error('Generation cancelled');
      } else {
        toast.error(error.message || 'Failed to generate proof');
      }
      return null;
    }
  }, [wallet, walletAddress]);

  return {
    // Wallet state
    wallet,
    address: storeAddress || walletAddress, // Use walletAddress from wallet if store address is empty
    connected: isConnected,
    connecting: wallet.connecting,
    
    // Auth state
    role,
    token,
    isAuthenticated: !!token,
    isAuthenticating,
    
    // Receipts
    receipts,
    isLoadingReceipts,
    
    // Actions
    connect: wallet.connect || (() => {}),
    disconnect,
    authenticate,
    fetchReceipts,
    
    // Transactions
    executePurchase,
    executeReturn,
    executeLoyaltyClaim,
    generateSupportProof,
  };
}
