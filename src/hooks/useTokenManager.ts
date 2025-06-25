import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { tokenStorage, UserTokenWithMetadata, UserToken, createUserTokenFromEvent } from '../lib/tokenStorage';
import { ContractUtils } from '../lib/contracts';

export interface UseTokenManagerReturn {
  // State
  userTokens: UserTokenWithMetadata[];
  selectedToken: UserTokenWithMetadata | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refreshTokens: () => Promise<void>;
  selectToken: (tokenAddress: string) => void;
  addToken: (token: UserToken) => void;
  removeToken: (tokenAddress: string) => void;
  updateTokenMetadata: (tokenAddress: string, metadata: any) => void;
  syncWithBlockchain: () => Promise<void>;
  
  // Utilities
  searchTokens: (query: string) => UserTokenWithMetadata[];
  getTokenByAddress: (address: string) => UserTokenWithMetadata | undefined;
}

export function useTokenManager(
  userAddress: string,
  signer?: ethers.JsonRpcSigner,
  chainId: number = 4207
): UseTokenManagerReturn {
  const [userTokens, setUserTokens] = useState<UserTokenWithMetadata[]>([]);
  const [selectedToken, setSelectedToken] = useState<UserTokenWithMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load tokens from storage
  const loadTokens = useCallback(() => {
    if (!userAddress) return;
    
    try {
      const tokens = tokenStorage.getUserTokens(userAddress);
      const networkTokens = tokens.filter(token => token.chainId === chainId);
      setUserTokens(networkTokens);
      
      // If no token is selected but we have tokens, select the first one
      if (!selectedToken && networkTokens.length > 0) {
        setSelectedToken(networkTokens[0]);
      }
      
      // If selected token is not in the current network, clear selection
      if (selectedToken && selectedToken.chainId !== chainId) {
        setSelectedToken(null);
      }
    } catch (err) {
      console.error('Error loading tokens:', err);
      setError('Failed to load tokens from storage');
    }
  }, [userAddress, chainId, selectedToken]);

  // Refresh tokens (reload from storage)
  const refreshTokens = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      loadTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh tokens');
    } finally {
      setIsLoading(false);
    }
  }, [loadTokens]);

  // Select a token by address
  const selectToken = useCallback((tokenAddress: string) => {
    const token = userTokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
    setSelectedToken(token || null);
  }, [userTokens]);

  // Add a new token
  const addToken = useCallback((token: UserToken) => {
    if (!userAddress) return;
    
    try {
      tokenStorage.addUserToken(userAddress, token);
      loadTokens();
      
      // Auto-select the newly added token
      setSelectedToken({ ...token });
    } catch (err) {
      console.error('Error adding token:', err);
      setError('Failed to add token');
    }
  }, [userAddress, loadTokens]);

  // Remove a token
  const removeToken = useCallback((tokenAddress: string) => {
    if (!userAddress) return;
    
    try {
      tokenStorage.removeUserToken(userAddress, tokenAddress);
      loadTokens();
      
      // If the removed token was selected, clear selection
      if (selectedToken?.address.toLowerCase() === tokenAddress.toLowerCase()) {
        setSelectedToken(null);
      }
    } catch (err) {
      console.error('Error removing token:', err);
      setError('Failed to remove token');
    }
  }, [userAddress, loadTokens, selectedToken]);

  // Update token metadata
  const updateTokenMetadata = useCallback((tokenAddress: string, metadata: any) => {
    try {
      tokenStorage.updateTokenMetadata(tokenAddress, metadata);
      loadTokens();
    } catch (err) {
      console.error('Error updating token metadata:', err);
      setError('Failed to update token metadata');
    }
  }, [loadTokens]);

  // Sync with blockchain (fetch tokens from factory contract)
  const syncWithBlockchain = useCallback(async () => {
    if (!signer || !userAddress) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Syncing tokens from blockchain for user:', userAddress);
      
      // Get tokens from the factory contract
      const factoryTokens = await ContractUtils.getTokensByCreator(signer, userAddress);
      console.log('Factory tokens:', factoryTokens);
      
      // Convert and add each token
      for (const factoryToken of factoryTokens) {
        const userToken: UserToken = {
          address: factoryToken.tokenAddress,
          name: factoryToken.name,
          symbol: factoryToken.symbol,
          initialSupply: factoryToken.initialSupply?.toString() || '0',
          maxSupply: factoryToken.maxSupply?.toString() || '0',
          decimals: factoryToken.decimals,
          creator: factoryToken.creator,
          createdAt: Number(factoryToken.createdAt) * 1000, // Convert to milliseconds
          transactionHash: '', // We don't have this from the factory
          network: 'Edgen Chain',
          chainId: chainId
        };
        
        tokenStorage.addUserToken(userAddress, userToken);
      }
      
      // Reload tokens from storage
      loadTokens();
      
      console.log('Blockchain sync completed');
    } catch (err) {
      console.error('Error syncing with blockchain:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync with blockchain');
    } finally {
      setIsLoading(false);
    }
  }, [signer, userAddress, chainId, loadTokens]);

  // Search tokens
  const searchTokens = useCallback((query: string): UserTokenWithMetadata[] => {
    if (!userAddress || !query.trim()) return userTokens;
    
    return tokenStorage.searchTokens(userAddress, query);
  }, [userAddress, userTokens]);

  // Get token by address
  const getTokenByAddress = useCallback((address: string): UserTokenWithMetadata | undefined => {
    return userTokens.find(token => token.address.toLowerCase() === address.toLowerCase());
  }, [userTokens]);

  // Load tokens on mount and when dependencies change
  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  // Auto-sync with blockchain when signer becomes available
  useEffect(() => {
    if (signer && userAddress && userTokens.length === 0) {
      // Only auto-sync if we don't have any tokens yet
      syncWithBlockchain();
    }
  }, [signer, userAddress]); // Removed userTokens.length and syncWithBlockchain from deps to avoid infinite loop

  return {
    // State
    userTokens,
    selectedToken,
    isLoading,
    error,
    
    // Actions
    refreshTokens,
    selectToken,
    addToken,
    removeToken,
    updateTokenMetadata,
    syncWithBlockchain,
    
    // Utilities
    searchTokens,
    getTokenByAddress,
  };
}

// Hook for listening to token creation events
export function useTokenCreationListener(
  provider: ethers.BrowserProvider | null,
  userAddress: string,
  onTokenCreated?: (token: UserToken) => void
) {
  useEffect(() => {
    if (!provider || !userAddress) return;

    const handleTokenCreated = (
      tokenAddress: string,
      creator: string,
      name: string,
      symbol: string,
      initialSupply: bigint,
      maxSupply: bigint,
      decimals: number,
      event: any
    ) => {
      // Only handle tokens created by the current user
      if (creator.toLowerCase() !== userAddress.toLowerCase()) return;

      console.log('Token created event:', {
        tokenAddress,
        creator,
        name,
        symbol,
        initialSupply: initialSupply.toString(),
        maxSupply: maxSupply.toString(),
        decimals
      });

      const userToken: UserToken = {
        address: tokenAddress,
        name,
        symbol,
        initialSupply: initialSupply.toString(),
        maxSupply: maxSupply.toString(),
        decimals,
        creator,
        createdAt: Date.now(),
        transactionHash: event.transactionHash || '',
        network: 'Edgen Chain',
        chainId: 4207
      };

      // Add to storage
      tokenStorage.addUserToken(userAddress, userToken);
      
      // Call callback if provided
      if (onTokenCreated) {
        onTokenCreated(userToken);
      }
    };

    // Set up event listener
    try {
      // We'll need to get the factory contract and listen for events
      // This is a simplified version - in practice, you'd want to use the actual contract
      console.log('Setting up token creation listener for user:', userAddress);
      
      // Note: This would need to be implemented with the actual contract instance
      // For now, we'll rely on manual token addition after creation
      
    } catch (error) {
      console.error('Error setting up token creation listener:', error);
    }

    // Cleanup function
    return () => {
      // Remove event listeners
      console.log('Cleaning up token creation listener');
    };
  }, [provider, userAddress, onTokenCreated]);
}
