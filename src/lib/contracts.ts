import { ethers } from 'ethers';

// Contract ABIs
export const TOKEN_FACTORY_ABI = [
  "function createToken(string name, string symbol, uint256 initialSupply, uint256 maxSupply, uint8 decimals, address owner) payable returns (address)",
  "function getTokensByCreator(address creator) view returns (tuple(address tokenAddress, string name, string symbol, uint256 initialSupply, uint256 maxSupply, uint8 decimals, address creator, uint256 createdAt)[])",
  "function getTotalTokensCreated() view returns (uint256)",
  "function getTokenByIndex(uint256 index) view returns (tuple(address tokenAddress, string name, string symbol, uint256 initialSupply, uint256 maxSupply, uint8 decimals, address creator, uint256 createdAt))",
  "function isTokenFromFactory(address token) view returns (bool)",
  "function creationFee() view returns (uint256)",
  "function paused() view returns (bool)",
  "function factoryOwner() view returns (address)",
  "event TokenCreated(address indexed tokenAddress, address indexed creator, string name, string symbol, uint256 initialSupply, uint256 maxSupply, uint8 decimals)"
];

export const MINTABLE_TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function maxSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function remainingMintableSupply() view returns (uint256)",
  "function transfersEnabled() view returns (bool)",
  "function paused() view returns (bool)",
  "function canMint(address) view returns (bool)",
  "function canBurn(address) view returns (bool)",
  "function canPause(address) view returns (bool)",
  "function isAdmin(address) view returns (bool)",
  "function mint(address to, uint256 amount)",
  "function burn(uint256 amount)",
  "function burnFrom(address from, uint256 amount)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function pause()",
  "function unpause()",
  "function setTransfersEnabled(bool enabled)",
  "function setMaxSupply(uint256 newMaxSupply)",
  "function batchMint(address[] recipients, uint256[] amounts)",
  "function grantRole(bytes32 role, address account)",
  "function revokeRole(bytes32 role, address account)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function MINTER_ROLE() view returns (bytes32)",
  "function PAUSER_ROLE() view returns (bytes32)",
  "function BURNER_ROLE() view returns (bytes32)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event TokensMinted(address indexed to, uint256 amount)",
  "event TokensBurned(address indexed from, uint256 amount)",
  "event MaxSupplyUpdated(uint256 oldMaxSupply, uint256 newMaxSupply)",
  "event TransfersToggled(bool enabled)"
];

// Network configuration
export const EDGEN_CHAIN_CONFIG = {
  chainId: '0x106F', // 4207 in hex
  chainName: 'Edgen Chain',
  nativeCurrency: {
    name: 'EDGEN',
    symbol: 'EDGEN',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.layeredge.io'],
  blockExplorerUrls: ['https://edgenscan.io'],
};

// Contract addresses - these will be updated after deployment
export const CONTRACT_ADDRESSES = {
  TOKEN_FACTORY: import.meta.env.VITE_TOKEN_FACTORY_ADDRESS || '0x6a825c21AB4A0B9B93E18E08fCAf37ad3c82c7bD',
  MINTABLE_TOKEN: import.meta.env.VITE_MINTABLE_TOKEN_ADDRESS || '0x5a057D0a115D4f004Fd58a3faAe75eeBfb6aD414',
};

// Function to get contract addresses
export function getContractAddress(contractName: 'TokenFactory' | 'MintableToken'): string {
  const address = contractName === 'TokenFactory'
    ? CONTRACT_ADDRESSES.TOKEN_FACTORY
    : CONTRACT_ADDRESSES.MINTABLE_TOKEN;

  console.log(`Getting ${contractName} address:`, address);
  return address;
}

// Utility functions
export class ContractUtils {
  static async getTokenFactoryContract(signer: ethers.JsonRpcSigner): Promise<ethers.Contract> {
    const address = getContractAddress('TokenFactory');
    console.log('TokenFactory address from getContractAddress:', address);

    if (!address || address === '') {
      console.error('TokenFactory address is empty or undefined');
      console.log('Environment variables:', {
        VITE_TOKEN_FACTORY_ADDRESS: import.meta.env.VITE_TOKEN_FACTORY_ADDRESS,
        CONTRACT_ADDRESSES: CONTRACT_ADDRESSES
      });
      throw new Error('TokenFactory contract address not configured. Please check your environment variables.');
    }

    console.log('Creating TokenFactory contract with address:', address);
    return new ethers.Contract(address, TOKEN_FACTORY_ABI, signer);
  }

  static async getMintableTokenContract(signer: ethers.JsonRpcSigner, address?: string): Promise<ethers.Contract> {
    const contractAddress = address || getContractAddress('MintableToken');
    console.log('MintableToken address:', contractAddress);

    if (!contractAddress || contractAddress === '') {
      console.error('MintableToken address is empty or undefined');
      throw new Error('MintableToken contract address not configured. Please check your environment variables.');
    }

    return new ethers.Contract(contractAddress, MINTABLE_TOKEN_ABI, signer);
  }

  static async createToken(
    signer: ethers.JsonRpcSigner,
    tokenData: {
      name: string;
      symbol: string;
      initialSupply: string;
      maxSupply: string;
      decimals: number;
      owner: string;
    }
  ): Promise<{ contract: ethers.Contract; transaction: ethers.ContractTransactionResponse }> {
    const factory = await this.getTokenFactoryContract(signer);

    // Get creation fee
    const creationFee = await factory.creationFee();

    // Create token
    const tx = await factory.createToken(
      tokenData.name,
      tokenData.symbol,
      tokenData.initialSupply,
      tokenData.maxSupply,
      tokenData.decimals,
      tokenData.owner,
      { value: creationFee }
    );

    return { contract: factory, transaction: tx };
  }

  static async getTokensByCreator(signer: ethers.JsonRpcSigner, creator: string) {
    const factory = await this.getTokenFactoryContract(signer);
    return await factory.getTokensByCreator(creator);
  }

  static async mintTokens(
    signer: ethers.JsonRpcSigner,
    tokenAddress: string,
    to: string,
    amount: string,
    decimals: number = 18
  ): Promise<ethers.ContractTransactionResponse> {
    const token = await this.getMintableTokenContract(signer, tokenAddress);
    const parsedAmount = ethers.parseUnits(amount, decimals);
    return await token.mint(to, parsedAmount);
  }

  static async transferTokens(
    signer: ethers.JsonRpcSigner,
    tokenAddress: string,
    to: string,
    amount: string,
    decimals: number = 18
  ): Promise<ethers.ContractTransactionResponse> {
    const token = await this.getMintableTokenContract(signer, tokenAddress);
    const parsedAmount = ethers.parseUnits(amount, decimals);
    return await token.transfer(to, parsedAmount);
  }

  static async burnTokens(
    signer: ethers.JsonRpcSigner,
    tokenAddress: string,
    amount: string,
    decimals: number = 18
  ): Promise<ethers.ContractTransactionResponse> {
    const token = await this.getMintableTokenContract(signer, tokenAddress);
    const parsedAmount = ethers.parseUnits(amount, decimals);
    return await token.burn(parsedAmount);
  }

  static async getTokenInfo(signer: ethers.JsonRpcSigner, tokenAddress: string, userAddress: string) {
    const token = await this.getMintableTokenContract(signer, tokenAddress);
    
    const [
      name,
      symbol,
      decimals,
      totalSupply,
      maxSupply,
      balance,
      remainingMintable,
      transfersEnabled,
      isPaused,
      canMint,
      canBurn,
      canPause,
      isAdmin
    ] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply(),
      token.maxSupply(),
      token.balanceOf(userAddress),
      token.remainingMintableSupply(),
      token.transfersEnabled(),
      token.paused(),
      token.canMint(userAddress),
      token.canBurn(userAddress),
      token.canPause(userAddress),
      token.isAdmin(userAddress)
    ]);

    return {
      name,
      symbol,
      decimals,
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      maxSupply: ethers.formatUnits(maxSupply, decimals),
      balance: ethers.formatUnits(balance, decimals),
      remainingMintable: ethers.formatUnits(remainingMintable, decimals),
      transfersEnabled,
      isPaused,
      canMint,
      canBurn,
      canPause,
      isAdmin
    };
  }

  static async batchMint(
    signer: ethers.JsonRpcSigner,
    tokenAddress: string,
    recipients: string[],
    amounts: string[],
    decimals: number = 18
  ): Promise<ethers.ContractTransactionResponse> {
    const token = await this.getMintableTokenContract(signer, tokenAddress);
    const parsedAmounts = amounts.map(amount => ethers.parseUnits(amount, decimals));
    return await token.batchMint(recipients, parsedAmounts);
  }

  static async grantRole(
    signer: ethers.JsonRpcSigner,
    tokenAddress: string,
    role: string,
    account: string
  ): Promise<ethers.ContractTransactionResponse> {
    const token = await this.getMintableTokenContract(signer, tokenAddress);
    const roleHash = ethers.keccak256(ethers.toUtf8Bytes(role));
    return await token.grantRole(roleHash, account);
  }

  static async revokeRole(
    signer: ethers.JsonRpcSigner,
    tokenAddress: string,
    role: string,
    account: string
  ): Promise<ethers.ContractTransactionResponse> {
    const token = await this.getMintableTokenContract(signer, tokenAddress);
    const roleHash = ethers.keccak256(ethers.toUtf8Bytes(role));
    return await token.revokeRole(roleHash, account);
  }

  static formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  static formatTokenAmount(amount: string, decimals: number = 18): string {
    const num = parseFloat(ethers.formatUnits(amount, decimals));
    return new Intl.NumberFormat().format(num);
  }

  static async waitForTransaction(
    tx: ethers.ContractTransactionResponse,
    confirmations: number = 1
  ): Promise<ethers.ContractTransactionReceipt | null> {
    console.log(`Transaction sent: ${tx.hash}`);
    console.log(`Waiting for ${confirmations} confirmation(s)...`);
    
    const receipt = await tx.wait(confirmations);
    
    if (receipt) {
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    }
    
    return receipt;
  }

  static getExplorerUrl(txHash: string): string {
    return `${EDGEN_CHAIN_CONFIG.blockExplorerUrls[0]}/tx/${txHash}`;
  }

  static getAddressExplorerUrl(address: string): string {
    return `${EDGEN_CHAIN_CONFIG.blockExplorerUrls[0]}/address/${address}`;
  }
}

// Error handling utilities
export class ContractError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'ContractError';
  }
}

export function handleContractError(error: any): string {
  console.error('Contract error:', error);
  
  if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
    return 'Transaction may fail. Please check your inputs and try again.';
  }
  
  if (error.code === 'INSUFFICIENT_FUNDS') {
    return 'Insufficient funds to complete the transaction.';
  }
  
  if (error.code === 'USER_REJECTED') {
    return 'Transaction was rejected by user.';
  }
  
  if (error.message?.includes('execution reverted')) {
    const revertReason = error.message.split('execution reverted: ')[1];
    return revertReason || 'Transaction reverted';
  }
  
  return error.message || 'An unknown error occurred';
}

// Transaction status tracking
export interface TransactionStatus {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
}

export class TransactionTracker {
  private static transactions: Map<string, TransactionStatus> = new Map();

  static addTransaction(hash: string): void {
    this.transactions.set(hash, {
      hash,
      status: 'pending',
      confirmations: 0
    });
  }

  static updateTransaction(hash: string, update: Partial<TransactionStatus>): void {
    const existing = this.transactions.get(hash);
    if (existing) {
      this.transactions.set(hash, { ...existing, ...update });
    }
  }

  static getTransaction(hash: string): TransactionStatus | undefined {
    return this.transactions.get(hash);
  }

  static getAllTransactions(): TransactionStatus[] {
    return Array.from(this.transactions.values());
  }

  static removeTransaction(hash: string): void {
    this.transactions.delete(hash);
  }
}
