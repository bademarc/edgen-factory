'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContractAddress } from '../lib/contracts';
import { useTokenManager } from '../hooks/useTokenManager';
import { UserTokenWithMetadata, formatTokenDisplay, getTokenExplorerUrl } from '../lib/tokenStorage';

interface MintableTokenManagerProps {
  provider: ethers.BrowserProvider;
  signer: ethers.JsonRpcSigner;
  userAddress: string;
}

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  maxSupply: string;
  balance: string;
  remainingMintable: string;
  transfersEnabled: boolean;
  isPaused: boolean;
  canMint: boolean;
  canBurn: boolean;
  canPause: boolean;
  isAdmin: boolean;
}

export default function MintableTokenManager({ provider, signer, userAddress }: MintableTokenManagerProps) {
  // Token management hook
  const {
    userTokens,
    selectedToken,
    isLoading: tokensLoading,
    error: tokensError,
    selectToken,
    refreshTokens,
    syncWithBlockchain
  } = useTokenManager(userAddress, signer || undefined);

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  
  // Form states
  const [mintAmount, setMintAmount] = useState('');
  const [mintTo, setMintTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [burnAmount, setBurnAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Role management states
  const [roleAddress, setRoleAddress] = useState('');
  const [selectedRole, setSelectedRole] = useState('MINTER_ROLE');
  const [showRoleManager, setShowRoleManager] = useState(false);

  // Contract ABI - simplified for the main functions we need
  const contractABI = [
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
    "function transfer(address to, uint256 amount) returns (bool)",
    "function pause()",
    "function unpause()",
    "function setTransfersEnabled(bool enabled)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event TokensMinted(address indexed to, uint256 amount)",
    "event TokensBurned(address indexed from, uint256 amount)"
  ];

  // Get contract address from selected token or fallback to default
  const CONTRACT_ADDRESS = selectedToken?.address || getContractAddress('MintableToken');

  useEffect(() => {
    if (provider && signer && userAddress && CONTRACT_ADDRESS) {
      initializeContract();
    }
  }, [provider, signer, userAddress, CONTRACT_ADDRESS]);

  const initializeContract = async () => {
    try {
      setLoading(true);
      setError('');

      // Check if contract address is set
      if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
        setError('Contract address not configured. Please deploy the MintableToken contract first.');
        setLoading(false);
        return;
      }

      const tokenContract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
      setContract(tokenContract);

      await loadTokenInfo(tokenContract);
    } catch (err: any) {
      console.error('Error initializing contract:', err);
      setError(err.message || 'Failed to initialize contract');
    } finally {
      setLoading(false);
    }
  };

  const loadTokenInfo = async (tokenContract: ethers.Contract) => {
    try {
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
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
        tokenContract.totalSupply(),
        tokenContract.maxSupply(),
        tokenContract.balanceOf(userAddress),
        tokenContract.remainingMintableSupply(),
        tokenContract.transfersEnabled(),
        tokenContract.paused(),
        tokenContract.canMint(userAddress),
        tokenContract.canBurn(userAddress),
        tokenContract.canPause(userAddress),
        tokenContract.isAdmin(userAddress)
      ]);

      setTokenInfo({
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
      });
    } catch (err: any) {
      console.error('Error loading token info:', err);
      setError(err.message || 'Failed to load token information');
    }
  };

  const handleMint = async () => {
    if (!contract || !mintAmount || !mintTo) return;

    try {
      setIsProcessing(true);
      setError('');

      const amount = ethers.parseUnits(mintAmount, tokenInfo?.decimals || 18);
      const tx = await contract.mint(mintTo, amount);
      
      console.log('Mint transaction sent:', tx.hash);
      await tx.wait();
      
      // Reload token info
      await loadTokenInfo(contract);
      
      // Clear form
      setMintAmount('');
      setMintTo('');
      
      console.log('Mint successful');
    } catch (err: any) {
      console.error('Mint error:', err);
      setError(err.message || 'Failed to mint tokens');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransfer = async () => {
    if (!contract || !transferAmount || !transferTo) return;

    try {
      setIsProcessing(true);
      setError('');

      const amount = ethers.parseUnits(transferAmount, tokenInfo?.decimals || 18);
      const tx = await contract.transfer(transferTo, amount);
      
      console.log('Transfer transaction sent:', tx.hash);
      await tx.wait();
      
      // Reload token info
      await loadTokenInfo(contract);
      
      // Clear form
      setTransferAmount('');
      setTransferTo('');
      
      console.log('Transfer successful');
    } catch (err: any) {
      console.error('Transfer error:', err);
      setError(err.message || 'Failed to transfer tokens');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBurn = async () => {
    if (!contract || !burnAmount) return;

    try {
      setIsProcessing(true);
      setError('');

      const amount = ethers.parseUnits(burnAmount, tokenInfo?.decimals || 18);
      const tx = await contract.burn(amount);
      
      console.log('Burn transaction sent:', tx.hash);
      await tx.wait();
      
      // Reload token info
      await loadTokenInfo(contract);
      
      // Clear form
      setBurnAmount('');
      
      console.log('Burn successful');
    } catch (err: any) {
      console.error('Burn error:', err);
      setError(err.message || 'Failed to burn tokens');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePauseToggle = async () => {
    if (!contract || !tokenInfo) return;

    try {
      setIsProcessing(true);
      setError('');

      const tx = tokenInfo.isPaused ? await contract.unpause() : await contract.pause();
      
      console.log('Pause toggle transaction sent:', tx.hash);
      await tx.wait();
      
      // Reload token info
      await loadTokenInfo(contract);
      
      console.log('Pause toggle successful');
    } catch (err: any) {
      console.error('Pause toggle error:', err);
      setError(err.message || 'Failed to toggle pause state');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransfersToggle = async () => {
    if (!contract || !tokenInfo) return;

    try {
      setIsProcessing(true);
      setError('');

      const tx = await contract.setTransfersEnabled(!tokenInfo.transfersEnabled);

      console.log('Transfers toggle transaction sent:', tx.hash);
      await tx.wait();

      // Reload token info
      await loadTokenInfo(contract);

      console.log('Transfers toggle successful');
    } catch (err: any) {
      console.error('Transfers toggle error:', err);
      setError(err.message || 'Failed to toggle transfers');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGrantRole = async () => {
    if (!contract || !roleAddress || !selectedRole) return;

    try {
      setIsProcessing(true);
      setError('');

      // Get the role hash
      const roleHash = await contract[selectedRole]();
      const tx = await contract.grantRole(roleHash, roleAddress);

      console.log('Grant role transaction sent:', tx.hash);
      await tx.wait();

      // Reload token info
      await loadTokenInfo(contract);

      // Clear form
      setRoleAddress('');

      console.log('Role granted successfully');
    } catch (err: any) {
      console.error('Grant role error:', err);
      setError(err.message || 'Failed to grant role');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevokeRole = async () => {
    if (!contract || !roleAddress || !selectedRole) return;

    try {
      setIsProcessing(true);
      setError('');

      // Get the role hash
      const roleHash = await contract[selectedRole]();
      const tx = await contract.revokeRole(roleHash, roleAddress);

      console.log('Revoke role transaction sent:', tx.hash);
      await tx.wait();

      // Reload token info
      await loadTokenInfo(contract);

      // Clear form
      setRoleAddress('');

      console.log('Role revoked successfully');
    } catch (err: any) {
      console.error('Revoke role error:', err);
      setError(err.message || 'Failed to revoke role');
    } finally {
      setIsProcessing(false);
    }
  };

  const checkAddressRole = async (address: string, role: string): Promise<boolean> => {
    if (!contract) return false;

    try {
      const roleHash = await contract[role]();
      return await contract.hasRole(roleHash, address);
    } catch (error) {
      console.error('Error checking role:', error);
      return false;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading token information...</p>
        </div>
      </div>
    );
  }

  if (error && !tokenInfo) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
          <button
            onClick={initializeContract}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!tokenInfo) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Token Selector */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Mintable Token Manager</h2>

          <div className="flex gap-2">
            <button
              onClick={syncWithBlockchain}
              disabled={tokensLoading}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {tokensLoading ? 'Syncing...' : 'Sync Tokens'}
            </button>
            <button
              onClick={refreshTokens}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {userTokens.length > 0 ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="tokenSelect" className="block text-sm font-medium text-gray-700 mb-2">
                Select Token to Manage
              </label>
              <select
                id="tokenSelect"
                value={selectedToken?.address || ''}
                onChange={(e) => selectToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              >
                <option value="">Select a token...</option>
                {userTokens.map((token) => (
                  <option key={token.address} value={token.address}>
                    {formatTokenDisplay(token)} - {token.address.slice(0, 8)}...
                  </option>
                ))}
              </select>
            </div>

            {selectedToken && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-blue-900">
                      {selectedToken.name} ({selectedToken.symbol})
                    </h3>
                    <p className="text-sm text-blue-700">
                      Created: {new Date(selectedToken.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <a
                    href={getTokenExplorerUrl(selectedToken)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    View on Explorer
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">
              No tokens found. Create your first token using the Token Factory.
            </p>
            <button
              onClick={syncWithBlockchain}
              disabled={tokensLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {tokensLoading ? 'Syncing...' : 'Sync from Blockchain'}
            </button>
          </div>
        )}

        {tokensError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{tokensError}</p>
          </div>
        )}
      </div>

      {/* Token Information */}
      {selectedToken && tokenInfo && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Token Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-700">Token Details</h3>
            <p className="text-sm text-gray-600 mt-1">
              {tokenInfo.name} ({tokenInfo.symbol})
            </p>
            <p className="text-xs text-gray-500">
              Decimals: {tokenInfo.decimals}
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-700">Your Balance</h3>
            <p className="text-lg font-semibold text-gray-900">
              {parseFloat(tokenInfo.balance).toLocaleString()} {tokenInfo.symbol}
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-700">Supply Info</h3>
            <p className="text-sm text-gray-600">
              Total: {parseFloat(tokenInfo.totalSupply).toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">
              Max: {parseFloat(tokenInfo.maxSupply).toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">
              Remaining: {parseFloat(tokenInfo.remainingMintable).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`px-2 py-1 rounded text-xs ${tokenInfo.isPaused ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            {tokenInfo.isPaused ? 'Paused' : 'Active'}
          </span>
          <span className={`px-2 py-1 rounded text-xs ${tokenInfo.transfersEnabled ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            Transfers {tokenInfo.transfersEnabled ? 'Enabled' : 'Disabled'}
          </span>
          {tokenInfo.canMint && (
            <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">Can Mint</span>
          )}
          {tokenInfo.isAdmin && (
            <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">Admin</span>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Action Buttons for Admins */}
      {(tokenInfo.isAdmin || tokenInfo.canPause) && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Controls</h2>
          
          <div className="flex flex-wrap gap-4">
            {tokenInfo.canPause && (
              <button
                onClick={handlePauseToggle}
                disabled={isProcessing}
                className={`px-4 py-2 rounded transition-colors ${
                  tokenInfo.isPaused
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                } disabled:opacity-50`}
              >
                {tokenInfo.isPaused ? 'Unpause' : 'Pause'} Contract
              </button>
            )}
            
            {tokenInfo.isAdmin && (
              <button
                onClick={handleTransfersToggle}
                disabled={isProcessing}
                className={`px-4 py-2 rounded transition-colors ${
                  tokenInfo.transfersEnabled
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                } disabled:opacity-50`}
              >
                {tokenInfo.transfersEnabled ? 'Disable' : 'Enable'} Transfers
              </button>
            )}

            {tokenInfo.isAdmin && (
              <button
                onClick={() => setShowRoleManager(!showRoleManager)}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
              >
                {showRoleManager ? 'Hide' : 'Show'} Role Manager
              </button>
            )}
          </div>
        </div>
      )}

      {/* Role Management */}
      {tokenInfo.isAdmin && showRoleManager && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Role Management</h2>

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Available Roles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="text-blue-800">
                  <strong>MINTER_ROLE:</strong> Can mint new tokens
                </div>
                <div className="text-blue-800">
                  <strong>BURNER_ROLE:</strong> Can burn tokens from any address
                </div>
                <div className="text-blue-800">
                  <strong>PAUSER_ROLE:</strong> Can pause/unpause the contract
                </div>
                <div className="text-blue-800">
                  <strong>DEFAULT_ADMIN_ROLE:</strong> Full administrative control
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={roleAddress}
                  onChange={(e) => setRoleAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                >
                  <option value="MINTER_ROLE">Minter Role</option>
                  <option value="BURNER_ROLE">Burner Role</option>
                  <option value="PAUSER_ROLE">Pauser Role</option>
                  <option value="DEFAULT_ADMIN_ROLE">Admin Role</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleGrantRole}
                disabled={isProcessing || !roleAddress || !ethers.isAddress(roleAddress)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Grant Role'}
              </button>

              <button
                onClick={handleRevokeRole}
                disabled={isProcessing || !roleAddress || !ethers.isAddress(roleAddress)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Revoke Role'}
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                <strong>Warning:</strong> Be careful when granting admin roles. Admin role holders can grant/revoke all other roles and have full control over the token contract.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mint Tokens */}
        {tokenInfo.canMint && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Mint Tokens</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={mintTo}
                  onChange={(e) => setMintTo(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount to Mint
                </label>
                <input
                  type="number"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available to mint: {parseFloat(tokenInfo.remainingMintable).toLocaleString()} {tokenInfo.symbol}
                </p>
              </div>
              
              <button
                onClick={handleMint}
                disabled={isProcessing || !mintAmount || !mintTo}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? 'Minting...' : 'Mint Tokens'}
              </button>
            </div>
          </div>
        )}

        {/* Transfer Tokens */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Transfer Tokens</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient Address
              </label>
              <input
                type="text"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount to Transfer
              </label>
              <input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your balance: {parseFloat(tokenInfo.balance).toLocaleString()} {tokenInfo.symbol}
              </p>
            </div>
            
            <button
              onClick={handleTransfer}
              disabled={isProcessing || !transferAmount || !transferTo || tokenInfo.isPaused}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? 'Transferring...' : 'Transfer Tokens'}
            </button>
          </div>
        </div>

        {/* Burn Tokens */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Burn Tokens</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount to Burn
              </label>
              <input
                type="number"
                value={burnAmount}
                onChange={(e) => setBurnAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 bg-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your balance: {parseFloat(tokenInfo.balance).toLocaleString()} {tokenInfo.symbol}
              </p>
            </div>
            
            <button
              onClick={handleBurn}
              disabled={isProcessing || !burnAmount || tokenInfo.isPaused}
              className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? 'Burning...' : 'Burn Tokens'}
            </button>
          </div>
        </div>
      </div>
        </div>
      )}
    </div>
  );
}
