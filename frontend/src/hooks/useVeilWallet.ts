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
   * Execute a purchase transaction
   * Calls the veilreceipt_v1.aleo::purchase function
   * Uses the @provablehq executeTransaction API
   */
  const executePurchase = useCallback(async (
    merchantAddress: string,
    totalMicrocredits: number,
    cartCommitment: string,
    timestamp: number
  ): Promise<string | null> => {
    const walletAny = wallet as any;
    
    // Check for executeTransaction (provablehq API)
    if (!walletAny.executeTransaction) {
      log('executeTransaction not available on wallet:', Object.keys(walletAny));
      toast.error('Wallet does not support transactions');
      return null;
    }

    if (!walletAddress) {
      toast.error('Wallet not connected');
      return null;
    }

    // Format inputs for Aleo - @provablehq TransactionOptions format
    const txOptions = {
      program: ALEO_CONFIG.programId,
      function: 'purchase',
      inputs: [
        merchantAddress, // address
        `${totalMicrocredits}u64`, // u64
        cartCommitment, // field
        `${timestamp}u64`, // u64
      ],
      fee: DEFAULT_FEE, // Fee in microcredits
      privateFee: false, // Use public credits for fee
    };

    // Check if buyer is same as merchant (contract will reject this)
    if (merchantAddress === walletAddress) {
      toast.error('Cannot buy from yourself! Use a different wallet for testing.');
      return null;
    }

    log('Submitting purchase transaction:', txOptions);
    log('Inputs detail:', {
      merchant: merchantAddress,
      buyer: walletAddress,
      total: `${totalMicrocredits}u64`,
      commitment: cartCommitment,
      timestamp: `${timestamp}u64`,
    });
    toast.loading('Waiting for wallet confirmation...', { id: 'tx-wallet' });

    try {
      const response = await walletAny.executeTransaction(txOptions);
      toast.dismiss('tx-wallet');

      log('Purchase transaction response:', response);
      
      if (response?.transactionId) {
        toast.success('Transaction submitted!');
        return response.transactionId;
      } else {
        toast.error('Transaction failed - no transaction ID');
        return null;
      }
    } catch (error: any) {
      toast.dismiss('tx-wallet');
      console.error('Purchase transaction failed:', error);
      
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
   * Calls veilreceipt_v1.aleo::open_return (consumes receipt)
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
    
    // FIRST: Try using the plaintext property directly if available
    // Leo Wallet provides this in the correct format
    if (rawRecord?.plaintext) {
      log('Using wallet plaintext directly:', rawRecord.plaintext);
      
      const txOptions = {
        program: ALEO_CONFIG.programId,
        function: 'open_return',
        inputs: [
          rawRecord.plaintext,
          returnReasonHash,
        ],
        fee: DEFAULT_FEE,
      };
      
      log('Submitting return with plaintext:', txOptions);
      toast.loading('Waiting for wallet confirmation...', { id: 'tx-wallet' });
      
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
      } catch (plaintextError: any) {
        toast.dismiss('tx-wallet');
        log('Plaintext approach failed:', plaintextError);
        console.error('Return with plaintext failed:', plaintextError);
        
        if (plaintextError.message?.includes('nullifier') || plaintextError.message?.includes('already')) {
          toast.error('This receipt has already been used for a return');
        } else if (plaintextError.message?.includes('reject') || plaintextError.message?.includes('cancel')) {
          toast.error('Transaction cancelled');
        } else {
          toast.error(plaintextError.message || 'Return failed');
        }
        return null;
      }
    }
    
    // No plaintext available - cannot proceed
    toast.error('Record plaintext not available. Please reconnect wallet.');
    return null;
  }, [wallet, walletAddress]);

  /**
   * Execute a loyalty claim transaction
   * Calls veilreceipt_v1.aleo::claim_loyalty (consumes receipt)
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
   * Calls veilreceipt_v1.aleo::prove_purchase_for_support
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
