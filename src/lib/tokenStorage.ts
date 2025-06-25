import { ethers } from 'ethers';

// Types for token management
export interface UserToken {
  address: string;
  name: string;
  symbol: string;
  initialSupply: string;
  maxSupply: string;
  decimals: number;
  creator: string;
  createdAt: number;
  transactionHash: string;
  network: string;
  chainId: number;
}

export interface TokenMetadata {
  description?: string;
  website?: string;
  logo?: string;
  tags?: string[];
  isVerified?: boolean;
  lastUpdated: number;
}

export interface UserTokenWithMetadata extends UserToken {
  metadata?: TokenMetadata;
}

// Storage keys
const STORAGE_KEYS = {
  USER_TOKENS: 'edgen_user_tokens',
  TOKEN_METADATA: 'edgen_token_metadata',
  LAST_SYNC: 'edgen_last_sync',
} as const;

// Token storage class
export class TokenStorage {
  private static instance: TokenStorage;
  private userTokens: Map<string, UserTokenWithMetadata[]> = new Map();
  private tokenMetadata: Map<string, TokenMetadata> = new Map();

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): TokenStorage {
    if (!TokenStorage.instance) {
      TokenStorage.instance = new TokenStorage();
    }
    return TokenStorage.instance;
  }

  // Load data from localStorage
  private loadFromStorage(): void {
    try {
      // Load user tokens
      const userTokensData = localStorage.getItem(STORAGE_KEYS.USER_TOKENS);
      if (userTokensData) {
        const parsed = JSON.parse(userTokensData);
        this.userTokens = new Map(Object.entries(parsed));
      }

      // Load token metadata
      const metadataData = localStorage.getItem(STORAGE_KEYS.TOKEN_METADATA);
      if (metadataData) {
        const parsed = JSON.parse(metadataData);
        this.tokenMetadata = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.error('Error loading token data from storage:', error);
    }
  }

  // Save data to localStorage
  private saveToStorage(): void {
    try {
      // Save user tokens
      const userTokensObj = Object.fromEntries(this.userTokens);
      localStorage.setItem(STORAGE_KEYS.USER_TOKENS, JSON.stringify(userTokensObj));

      // Save token metadata
      const metadataObj = Object.fromEntries(this.tokenMetadata);
      localStorage.setItem(STORAGE_KEYS.TOKEN_METADATA, JSON.stringify(metadataObj));

      // Update last sync timestamp
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
    } catch (error) {
      console.error('Error saving token data to storage:', error);
    }
  }

  // Add a new token for a user
  public addUserToken(userAddress: string, token: UserToken): void {
    const normalizedAddress = userAddress.toLowerCase();
    const userTokens = this.userTokens.get(normalizedAddress) || [];
    
    // Check if token already exists
    const existingIndex = userTokens.findIndex(t => t.address.toLowerCase() === token.address.toLowerCase());
    
    if (existingIndex >= 0) {
      // Update existing token
      userTokens[existingIndex] = { ...userTokens[existingIndex], ...token };
    } else {
      // Add new token
      userTokens.push(token);
    }
    
    this.userTokens.set(normalizedAddress, userTokens);
    this.saveToStorage();
  }

  // Get all tokens for a user
  public getUserTokens(userAddress: string): UserTokenWithMetadata[] {
    const normalizedAddress = userAddress.toLowerCase();
    const tokens = this.userTokens.get(normalizedAddress) || [];
    
    // Merge with metadata
    return tokens.map(token => ({
      ...token,
      metadata: this.tokenMetadata.get(token.address.toLowerCase())
    }));
  }

  // Get a specific token by address
  public getToken(userAddress: string, tokenAddress: string): UserTokenWithMetadata | undefined {
    const tokens = this.getUserTokens(userAddress);
    return tokens.find(token => token.address.toLowerCase() === tokenAddress.toLowerCase());
  }

  // Update token metadata
  public updateTokenMetadata(tokenAddress: string, metadata: Partial<TokenMetadata>): void {
    const normalizedAddress = tokenAddress.toLowerCase();
    const existing = this.tokenMetadata.get(normalizedAddress) || { lastUpdated: 0 };
    
    this.tokenMetadata.set(normalizedAddress, {
      ...existing,
      ...metadata,
      lastUpdated: Date.now()
    });
    
    this.saveToStorage();
  }

  // Remove a token from user's list
  public removeUserToken(userAddress: string, tokenAddress: string): void {
    const normalizedUserAddress = userAddress.toLowerCase();
    const normalizedTokenAddress = tokenAddress.toLowerCase();
    const userTokens = this.userTokens.get(normalizedUserAddress) || [];
    
    const filteredTokens = userTokens.filter(token => 
      token.address.toLowerCase() !== normalizedTokenAddress
    );
    
    this.userTokens.set(normalizedUserAddress, filteredTokens);
    this.saveToStorage();
  }

  // Get all tokens across all users (for admin purposes)
  public getAllTokens(): UserTokenWithMetadata[] {
    const allTokens: UserTokenWithMetadata[] = [];
    
    for (const tokens of this.userTokens.values()) {
      allTokens.push(...tokens.map(token => ({
        ...token,
        metadata: this.tokenMetadata.get(token.address.toLowerCase())
      })));
    }
    
    return allTokens;
  }

  // Search tokens by name or symbol
  public searchTokens(userAddress: string, query: string): UserTokenWithMetadata[] {
    const tokens = this.getUserTokens(userAddress);
    const lowerQuery = query.toLowerCase();
    
    return tokens.filter(token => 
      token.name.toLowerCase().includes(lowerQuery) ||
      token.symbol.toLowerCase().includes(lowerQuery) ||
      token.address.toLowerCase().includes(lowerQuery)
    );
  }

  // Get tokens by network
  public getTokensByNetwork(userAddress: string, chainId: number): UserTokenWithMetadata[] {
    const tokens = this.getUserTokens(userAddress);
    return tokens.filter(token => token.chainId === chainId);
  }

  // Export user data
  public exportUserData(userAddress: string): string {
    const tokens = this.getUserTokens(userAddress);
    return JSON.stringify({
      userAddress,
      tokens,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    }, null, 2);
  }

  // Import user data
  public importUserData(userAddress: string, data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      
      if (!parsed.tokens || !Array.isArray(parsed.tokens)) {
        throw new Error('Invalid data format');
      }
      
      // Validate and add tokens
      for (const token of parsed.tokens) {
        if (this.isValidToken(token)) {
          this.addUserToken(userAddress, token);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error importing user data:', error);
      return false;
    }
  }

  // Validate token data
  private isValidToken(token: any): token is UserToken {
    return (
      typeof token.address === 'string' &&
      typeof token.name === 'string' &&
      typeof token.symbol === 'string' &&
      typeof token.creator === 'string' &&
      typeof token.decimals === 'number' &&
      typeof token.createdAt === 'number' &&
      ethers.isAddress(token.address) &&
      ethers.isAddress(token.creator)
    );
  }

  // Clear all data (for testing or reset)
  public clearAllData(): void {
    this.userTokens.clear();
    this.tokenMetadata.clear();
    localStorage.removeItem(STORAGE_KEYS.USER_TOKENS);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_METADATA);
    localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
  }

  // Get storage statistics
  public getStorageStats(): {
    totalUsers: number;
    totalTokens: number;
    storageSize: number;
    lastSync: number;
  } {
    const totalUsers = this.userTokens.size;
    const totalTokens = this.getAllTokens().length;
    
    // Calculate approximate storage size
    const userTokensSize = localStorage.getItem(STORAGE_KEYS.USER_TOKENS)?.length || 0;
    const metadataSize = localStorage.getItem(STORAGE_KEYS.TOKEN_METADATA)?.length || 0;
    const storageSize = userTokensSize + metadataSize;
    
    const lastSync = parseInt(localStorage.getItem(STORAGE_KEYS.LAST_SYNC) || '0');
    
    return {
      totalUsers,
      totalTokens,
      storageSize,
      lastSync
    };
  }
}

// Utility functions
export const tokenStorage = TokenStorage.getInstance();

// Helper function to create a UserToken from contract event data
export function createUserTokenFromEvent(
  eventData: any,
  transactionHash: string,
  network: string,
  chainId: number
): UserToken {
  return {
    address: eventData.tokenAddress,
    name: eventData.name,
    symbol: eventData.symbol,
    initialSupply: eventData.initialSupply?.toString() || '0',
    maxSupply: eventData.maxSupply?.toString() || '0',
    decimals: eventData.decimals,
    creator: eventData.creator,
    createdAt: Date.now(),
    transactionHash,
    network,
    chainId
  };
}

// Helper function to format token display
export function formatTokenDisplay(token: UserTokenWithMetadata): string {
  return `${token.name} (${token.symbol})`;
}

// Helper function to get token explorer URL
export function getTokenExplorerUrl(token: UserToken): string {
  const baseUrl = token.chainId === 4207 ? 'https://edgenscan.io' : 'https://etherscan.io';
  return `${baseUrl}/address/${token.address}`;
}
