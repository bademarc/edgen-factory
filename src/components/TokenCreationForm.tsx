'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { getContractAddress } from '../lib/contracts';
import { useTokenManager } from '../hooks/useTokenManager';
import { UserToken } from '../lib/tokenStorage';

interface TokenCreationFormProps {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  userAddress: string;
  onTokenCreated: (tokenAddress: string, tokenInfo: any) => void;
}

interface TokenFormData {
  name: string;
  symbol: string;
  initialSupply: string;
  maxSupply: string;
  decimals: string;
  initialOwner: string;
  useDefaultMaxSupply: boolean;
}

export default function TokenCreationForm({
  provider,
  signer,
  userAddress,
  onTokenCreated
}: TokenCreationFormProps) {
  // Token management hook
  const { addToken } = useTokenManager(userAddress, signer || undefined);
  const [formData, setFormData] = useState<TokenFormData>({
    name: '',
    symbol: '',
    initialSupply: '',
    maxSupply: '',
    decimals: '18',
    initialOwner: '',
    useDefaultMaxSupply: true,
  });

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');

  // Get contract address using utility function
  const TOKEN_FACTORY_ADDRESS = getContractAddress('TokenFactory');

  // Debug logging (can be removed in production)
  if (import.meta.env.DEV) {
    console.log('TokenCreationForm - TOKEN_FACTORY_ADDRESS:', TOKEN_FACTORY_ADDRESS);
  }
  const TOKEN_FACTORY_ABI = [
    "function createToken(string memory name, string memory symbol, uint256 initialSupply, uint256 maxSupply, uint8 decimals, address owner) external payable returns (address)",
    "function creationFee() external view returns (uint256)",
    "function getTokensByCreator(address creator) external view returns (tuple(address tokenAddress, string name, string symbol, uint256 initialSupply, uint256 maxSupply, uint8 decimals, address creator, uint256 createdAt)[])",
    "event TokenCreated(address indexed tokenAddress, address indexed creator, string name, string symbol, uint256 initialSupply, uint256 maxSupply, uint8 decimals)"
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Token name is required');
      return false;
    }
    if (!formData.symbol.trim()) {
      setError('Token symbol is required');
      return false;
    }
    if (!formData.initialSupply || parseFloat(formData.initialSupply) < 0) {
      setError('Initial supply must be 0 or greater');
      return false;
    }
    if (!formData.useDefaultMaxSupply) {
      if (!formData.maxSupply || parseFloat(formData.maxSupply) <= 0) {
        setError('Max supply must be greater than 0');
        return false;
      }
      if (parseFloat(formData.initialSupply) > parseFloat(formData.maxSupply)) {
        setError('Initial supply cannot exceed max supply');
        return false;
      }
    }
    const decimals = parseInt(formData.decimals);
    if (isNaN(decimals) || decimals < 0 || decimals > 18) {
      setError('Decimals must be between 0 and 18');
      return false;
    }
    if (formData.initialOwner && !ethers.isAddress(formData.initialOwner)) {
      setError('Invalid initial owner address');
      return false;
    }
    return true;
  };

  const createToken = async () => {
    if (!provider || !signer) {
      setError('Please connect your wallet first');
      return;
    }

    if (!TOKEN_FACTORY_ADDRESS) {
      setError('Token factory contract address not configured');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    setError('');
    setTxHash('');

    try {
      const contract = new ethers.Contract(TOKEN_FACTORY_ADDRESS, TOKEN_FACTORY_ABI, signer);

      // Get creation fee
      const creationFee = await contract.creationFee();

      // Prepare parameters
      const name = formData.name.trim();
      const symbol = formData.symbol.trim().toUpperCase();
      const initialSupply = BigInt(formData.initialSupply || '0');
      const maxSupply = formData.useDefaultMaxSupply
        ? (initialSupply === 0n ? BigInt('1000000') : initialSupply * 10n)
        : BigInt(formData.maxSupply);
      const decimals = parseInt(formData.decimals);
      const owner = formData.initialOwner || ethers.ZeroAddress;

      // Create token
      const tx = await contract.createToken(
        name,
        symbol,
        initialSupply,
        maxSupply,
        decimals,
        owner,
        { value: creationFee }
      );

      setTxHash(tx.hash);

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      // Find TokenCreated event
      const tokenCreatedEvent = receipt.logs?.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'TokenCreated';
        } catch {
          return false;
        }
      });

      if (tokenCreatedEvent) {
        const parsedEvent = contract.interface.parseLog(tokenCreatedEvent);
        if (!parsedEvent) {
          throw new Error('Failed to parse token creation event');
        }
        const tokenAddress = parsedEvent.args.tokenAddress;

        // Create UserToken object for storage
        const userToken: UserToken = {
          address: tokenAddress,
          name: parsedEvent.args.name,
          symbol: parsedEvent.args.symbol,
          initialSupply: parsedEvent.args.initialSupply.toString(),
          maxSupply: parsedEvent.args.maxSupply.toString(),
          decimals: parsedEvent.args.decimals,
          creator: parsedEvent.args.creator,
          createdAt: Date.now(),
          transactionHash: tx.hash,
          network: 'Edgen Chain',
          chainId: 4207
        };

        // Add token to user's collection
        addToken(userToken);

        // Legacy token info for backward compatibility
        const tokenInfo = {
          address: tokenAddress,
          name: parsedEvent.args.name,
          symbol: parsedEvent.args.symbol,
          initialSupply: parsedEvent.args.initialSupply.toString(),
          maxSupply: parsedEvent.args.maxSupply.toString(),
          decimals: parsedEvent.args.decimals,
          creator: parsedEvent.args.creator,
          txHash: tx.hash,
        };

        onTokenCreated(tokenAddress, tokenInfo);

        // Reset form
        setFormData({
          name: '',
          symbol: '',
          initialSupply: '',
          maxSupply: '',
          decimals: '18',
          initialOwner: '',
          useDefaultMaxSupply: true,
        });
      }
    } catch (error: any) {
      console.error('Error creating token:', error);
      setError(error.message || 'Failed to create token');
    } finally {
      setIsCreating(false);
    }
  };

  const isFormValid = formData.name && formData.symbol && (formData.initialSupply || formData.initialSupply === '0');

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Token</h2>

      {/* Debug Information */}
      {import.meta.env.DEV && (
        <div className="mb-4 p-3 bg-gray-100 rounded-md text-xs">
          <strong>Debug Info:</strong><br/>
          TokenFactory Address: {TOKEN_FACTORY_ADDRESS || 'NOT SET'}<br/>
          Env Var: {import.meta.env.VITE_TOKEN_FACTORY_ADDRESS || 'NOT SET'}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {txHash && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-blue-800 text-sm">
            Transaction submitted:{' '}
            <a
              href={`https://edgenscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-600"
            >
              {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </a>
          </p>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); createToken(); }} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Token Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g., My Token"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            required
          />
        </div>

        <div>
          <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-1">
            Token Symbol *
          </label>
          <input
            type="text"
            id="symbol"
            name="symbol"
            value={formData.symbol}
            onChange={handleInputChange}
            placeholder="e.g., MTK"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            required
          />
        </div>

        <div>
          <label htmlFor="initialSupply" className="block text-sm font-medium text-gray-700 mb-1">
            Initial Supply
          </label>
          <input
            type="number"
            id="initialSupply"
            name="initialSupply"
            value={formData.initialSupply}
            onChange={handleInputChange}
            placeholder="e.g., 1000000 (can be 0 for mint-only tokens)"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          />
          <p className="text-xs text-gray-500 mt-1">
            Initial tokens minted to the owner. Can be 0 for mint-only tokens.
          </p>
        </div>

        <div>
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="useDefaultMaxSupply"
              name="useDefaultMaxSupply"
              checked={formData.useDefaultMaxSupply}
              onChange={handleInputChange}
              className="mr-2"
            />
            <label htmlFor="useDefaultMaxSupply" className="text-sm font-medium text-gray-700">
              Use default max supply (10x initial supply)
            </label>
          </div>

          {!formData.useDefaultMaxSupply && (
            <div>
              <label htmlFor="maxSupply" className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Supply *
              </label>
              <input
                type="number"
                id="maxSupply"
                name="maxSupply"
                value={formData.maxSupply}
                onChange={handleInputChange}
                placeholder="e.g., 10000000"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                required={!formData.useDefaultMaxSupply}
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum tokens that can ever be minted.
              </p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="decimals" className="block text-sm font-medium text-gray-700 mb-1">
            Decimals
          </label>
          <input
            type="number"
            id="decimals"
            name="decimals"
            value={formData.decimals}
            onChange={handleInputChange}
            min="0"
            max="18"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          />
          <p className="text-xs text-gray-500 mt-1">Default: 18 (recommended)</p>
        </div>

        <div>
          <label htmlFor="initialOwner" className="block text-sm font-medium text-gray-700 mb-1">
            Initial Owner (Optional)
          </label>
          <input
            type="text"
            id="initialOwner"
            name="initialOwner"
            value={formData.initialOwner}
            onChange={handleInputChange}
            placeholder={`Leave empty to use your address: ${userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : ''}`}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          />
          <p className="text-xs text-gray-500 mt-1">
            If empty, you will be the initial owner
          </p>
        </div>

        <button
          type="submit"
          disabled={!isFormValid || isCreating || !provider}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCreating ? 'Creating Token...' : 'Create Token'}
        </button>
      </form>

      <div className="mt-4 text-xs text-gray-500">
        <p>* Required fields</p>
        <p>Make sure you're connected to Edgen Chain network</p>
      </div>
    </div>
  );
}
