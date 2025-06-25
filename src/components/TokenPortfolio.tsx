import { useState } from 'react';
import { ethers } from 'ethers';
import { useTokenManager } from '../hooks/useTokenManager';
import { UserTokenWithMetadata, formatTokenDisplay, getTokenExplorerUrl } from '../lib/tokenStorage';

interface TokenPortfolioProps {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  userAddress: string;
  onSelectToken: (tokenAddress: string) => void;
  onCreateToken: () => void;
}

interface TokenStats {
  totalTokens: number;
  totalValue: string;
  recentActivity: number;
}

export default function TokenPortfolio({
  signer,
  userAddress,
  onSelectToken,
  onCreateToken
}: TokenPortfolioProps) {
  const {
    userTokens,
    isLoading,
    error,
    refreshTokens,
    syncWithBlockchain,
    searchTokens,
    removeToken
  } = useTokenManager(userAddress, signer || undefined);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'symbol'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showStats] = useState(true);

  // Filter and sort tokens
  const filteredTokens = searchQuery 
    ? searchTokens(searchQuery)
    : userTokens;

  const sortedTokens = [...filteredTokens].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'symbol':
        comparison = a.symbol.localeCompare(b.symbol);
        break;
      case 'created':
        comparison = a.createdAt - b.createdAt;
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Calculate stats
  const stats: TokenStats = {
    totalTokens: userTokens.length,
    totalValue: '0', // Could be enhanced with price data
    recentActivity: userTokens.filter(token => 
      Date.now() - token.createdAt < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    ).length
  };

  const handleRemoveToken = async (tokenAddress: string) => {
    if (window.confirm('Are you sure you want to remove this token from your portfolio? This will not affect the actual token contract.')) {
      removeToken(tokenAddress);
    }
  };

  const getTokenStatusColor = (token: UserTokenWithMetadata): string => {
    const daysSinceCreation = (Date.now() - token.createdAt) / (1000 * 60 * 60 * 24);
    
    if (daysSinceCreation < 1) return 'bg-green-100 text-green-800';
    if (daysSinceCreation < 7) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getTokenStatusText = (token: UserTokenWithMetadata): string => {
    const daysSinceCreation = (Date.now() - token.createdAt) / (1000 * 60 * 60 * 24);
    
    if (daysSinceCreation < 1) return 'New';
    if (daysSinceCreation < 7) return 'Recent';
    return 'Active';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Token Portfolio</h1>
            <p className="text-gray-600">Manage your created tokens</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onCreateToken}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Create New Token
            </button>
            <button
              onClick={syncWithBlockchain}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Syncing...' : 'Sync'}
            </button>
            <button
              onClick={refreshTokens}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tokens</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalTokens}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recent Activity</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.recentActivity}</p>
                <p className="text-xs text-gray-500">Last 7 days</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Network</p>
                <p className="text-lg font-semibold text-gray-900">Edgen Chain</p>
                <p className="text-xs text-gray-500">Chain ID: 4207</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search tokens by name, symbol, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'created' | 'symbol')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            >
              <option value="created">Sort by Created</option>
              <option value="name">Sort by Name</option>
              <option value="symbol">Sort by Symbol</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Token List */}
      <div className="bg-white rounded-lg shadow-md">
        {sortedTokens.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No tokens found' : 'No tokens yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'Create your first token to get started'
              }
            </p>
            {!searchQuery && (
              <button
                onClick={onCreateToken}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Create Your First Token
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sortedTokens.map((token) => (
              <div key={token.address} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {formatTokenDisplay(token)}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTokenStatusColor(token)}`}>
                        {getTokenStatusText(token)}
                      </span>
                      {token.creator.toLowerCase() === userAddress.toLowerCase() && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Owner
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Address:</span>
                        <p className="font-mono">{token.address.slice(0, 10)}...{token.address.slice(-8)}</p>
                      </div>
                      <div>
                        <span className="font-medium">Initial Supply:</span>
                        <p>{parseFloat(token.initialSupply).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="font-medium">Max Supply:</span>
                        <p>{parseFloat(token.maxSupply).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="font-medium">Created:</span>
                        <p>{new Date(token.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => onSelectToken(token.address)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                    >
                      Manage
                    </button>
                    
                    <a
                      href={getTokenExplorerUrl(token)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                    >
                      Explorer
                    </a>
                    
                    <button
                      onClick={() => handleRemoveToken(token.address)}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
