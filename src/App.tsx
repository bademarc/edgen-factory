import { useState } from 'react';
import { ethers } from 'ethers';
import WalletConnect from '@/components/WalletConnect';
import TokenCreationForm from '@/components/TokenCreationForm';
import MintableTokenManager from '@/components/MintableTokenManager';
import TokenPortfolio from '@/components/TokenPortfolio';
import ClientOnly from '@/components/ClientOnly';
import ErrorBoundary from '@/components/ErrorBoundary';
import Header from '@/components/Header';
import Logo from '@/components/Logo';

interface CreatedToken {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
  decimals: number;
  creator: string;
  txHash: string;
}

function App() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [userAddress, setUserAddress] = useState<string>('');
  const [createdTokens, setCreatedTokens] = useState<CreatedToken[]>([]);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'factory' | 'mintable'>('portfolio');

  const handleWalletConnected = (
    walletProvider: ethers.BrowserProvider,
    walletSigner: ethers.JsonRpcSigner,
    address: string
  ) => {
    setProvider(walletProvider);
    setSigner(walletSigner);
    setUserAddress(address);
  };

  const handleWalletDisconnected = () => {
    setProvider(null);
    setSigner(null);
    setUserAddress('');
    setCreatedTokens([]);
  };

  const handleTokenCreated = (tokenAddress: string, tokenInfo: any) => {
    const newToken: CreatedToken = {
      address: tokenAddress,
      name: tokenInfo.name,
      symbol: tokenInfo.symbol,
      totalSupply: tokenInfo.totalSupply || tokenInfo.initialSupply || '0',
      decimals: tokenInfo.decimals,
      creator: tokenInfo.creator,
      txHash: tokenInfo.txHash,
    };
    setCreatedTokens(prev => [newToken, ...prev]);

    // Auto-navigate to portfolio after token creation
    setActiveTab('portfolio');
  };

  const handleSelectToken = (_tokenAddress: string) => {
    setActiveTab('mintable');
  };

  const handleCreateToken = () => {
    setActiveTab('factory');
  };

  const formatSupply = (supply: string, _decimals: number) => {
    try {
      // Convert BigInt string to number for display
      const supplyBI = BigInt(supply);
      return new Intl.NumberFormat().format(Number(supplyBI));
    } catch {
      return supply;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <Header />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Wallet Connection Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Connect Your Wallet</h2>
            <ClientOnly fallback={<div className="text-center py-4">Loading wallet connection...</div>}>
              <WalletConnect
                onWalletConnected={handleWalletConnected}
                onWalletDisconnected={handleWalletDisconnected}
              />
            </ClientOnly>
          </div>

          {/* Tab Navigation */}
          {provider && signer && userAddress && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('portfolio')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'portfolio'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Token Portfolio
                </button>
                <button
                  onClick={() => setActiveTab('factory')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'factory'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Create Token
                </button>
                <button
                  onClick={() => setActiveTab('mintable')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'mintable'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Manage Token
                </button>
              </div>
            </div>
          )}

          {/* Content based on active tab */}
          {provider && signer && userAddress && activeTab === 'portfolio' && (
            <TokenPortfolio
              provider={provider}
              signer={signer}
              userAddress={userAddress}
              onSelectToken={handleSelectToken}
              onCreateToken={handleCreateToken}
            />
          )}

          {provider && signer && userAddress && activeTab === 'factory' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Token Creation Form */}
              <div>
                <TokenCreationForm
                  provider={provider}
                  signer={signer}
                  userAddress={userAddress}
                  onTokenCreated={handleTokenCreated}
                />
              </div>

              {/* Created Tokens List */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Created Tokens</h2>
                
                {createdTokens.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-lg mb-2">🪙</div>
                    <p className="text-gray-500">No tokens created yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Create your first token using the form on the left
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {createdTokens.map((token, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900">{token.name}</h3>
                            <p className="text-sm text-gray-600">{token.symbol}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {formatSupply(token.totalSupply, token.decimals)} {token.symbol}
                            </p>
                            <p className="text-xs text-gray-500">{token.decimals} decimals</p>
                          </div>
                        </div>
                        
                        <div className="space-y-1 text-xs text-gray-500">
                          <div className="flex justify-between">
                            <span>Contract:</span>
                            <a
                              href={`https://edgenscan.io/address/${token.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              {token.address.slice(0, 6)}...{token.address.slice(-4)}
                            </a>
                          </div>
                          <div className="flex justify-between">
                            <span>Transaction:</span>
                            <a
                              href={`https://edgenscan.io/tx/${token.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              {token.txHash.slice(0, 6)}...{token.txHash.slice(-4)}
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mintable Token Manager */}
          {provider && signer && userAddress && activeTab === 'mintable' && (
            <MintableTokenManager
              provider={provider}
              signer={signer}
              userAddress={userAddress}
            />
          )}

          {/* Information Section */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-3">How to Use</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
              <div>
                <h3 className="font-medium mb-2">1. Connect Wallet</h3>
                <p>Connect your MetaMask wallet and ensure you're on the Edgen Chain network.</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">2. Fill Token Details</h3>
                <p>Enter your token name, symbol, total supply, and other parameters.</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">3. Create Token</h3>
                <p>Click "Create Token" and confirm the transaction in your wallet.</p>
              </div>
            </div>
          </div>

          {/* Network Information */}
          <div className="mt-8 bg-gray-100 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Edgen Chain Network</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <h3 className="font-medium text-gray-700">Network Name</h3>
                <p className="text-gray-600">Edgen Chain</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-700">RPC URL</h3>
                <p className="text-gray-600 break-all">https://rpc.layeredge.io</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-700">Chain ID</h3>
                <p className="text-gray-600">4207</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-700">Block Explorer</h3>
                <a
                  href="https://edgenscan.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  edgenscan.io
                </a>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col items-center space-y-4">
              {/* Footer Logo */}
              <Logo size="sm" showText={true} variant="default" />

              {/* Footer Text */}
              <div className="text-center text-sm text-gray-500">
                <p>Create ERC-20 tokens with ease on Edgen Chain</p>
                <p className="mt-1">
                  Make sure to test on testnet before deploying to mainnet
                </p>
              </div>

              {/* Links */}
              <div className="flex space-x-6 text-xs text-gray-400">
                <a href="https://edgenscan.io" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">
                  Block Explorer
                </a>
                <span>•</span>
                <a href="https://rpc.layeredge.io" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">
                  RPC Endpoint
                </a>
                <span>•</span>
                <span>Chain ID: 4207</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default App;
