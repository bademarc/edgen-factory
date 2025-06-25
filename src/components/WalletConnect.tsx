'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface WalletConnectProps {
  onWalletConnected: (provider: ethers.BrowserProvider, signer: ethers.JsonRpcSigner, address: string) => void;
  onWalletDisconnected: () => void;
}

export default function WalletConnect({ onWalletConnected, onWalletDisconnected }: WalletConnectProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'correct' | 'wrong' | 'unknown'>('unknown');
  const [balance, setBalance] = useState<string>('0');

  // Edgen Chain network configuration
  const edgenChainConfig = {
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

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    checkConnection();

    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [isClient]);

  const checkConnection = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const address = await signer.getAddress();

          // Check network
          const network = await provider.getNetwork();
          const isCorrectNetwork = network.chainId === BigInt(4207);
          setNetworkStatus(isCorrectNetwork ? 'correct' : 'wrong');

          // Get balance
          const balanceWei = await provider.getBalance(address);
          setBalance(ethers.formatEther(balanceWei));

          setIsConnected(true);
          setAddress(address);
          onWalletConnected(provider, signer, address);
        }
      } catch (error) {
        console.error('Error checking connection:', error);
        setNetworkStatus('unknown');
      }
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      setIsConnected(false);
      setAddress('');
      setBalance('0');
      setNetworkStatus('unknown');
      onWalletDisconnected();
    } else {
      setAddress(accounts[0]);
      checkConnection();
    }
  };

  const handleChainChanged = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const addEdgenChain = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [edgenChainConfig],
      });
    } catch (error) {
      console.error('Error adding Edgen Chain:', error);
      throw error;
    }
  };

  const switchToEdgenChain = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: edgenChainConfig.chainId }],
      });
    } catch (error: any) {
      // Chain not added to MetaMask
      if (error.code === 4902) {
        await addEdgenChain();
      } else {
        throw error;
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Check if we're on the correct network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== edgenChainConfig.chainId) {
        await switchToEdgenChain();
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setIsConnected(true);
      setAddress(address);
      onWalletConnected(provider, signer, address);
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      setError(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setAddress('');
    setBalance('0');
    setNetworkStatus('unknown');
    onWalletDisconnected();
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isClient) {
    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="px-6 py-3 bg-gray-200 text-gray-600 rounded-lg">
          Loading...
        </div>
      </div>
    );
  }

  if (typeof window === 'undefined' || !window.ethereum) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">
          MetaMask is not installed. Please install MetaMask to use this application.
        </p>
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Install MetaMask
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 w-full">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {!isConnected ? (
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                <p className="text-green-800 text-sm font-medium">
                  Connected: {formatAddress(address)}
                </p>
                <p className="text-green-600 text-xs">
                  Balance: {parseFloat(balance).toFixed(4)} EDGEN
                </p>
              </div>

              {/* Network Status */}
              <div className={`px-3 py-1 rounded-full text-xs font-medium inline-block ${
                networkStatus === 'correct'
                  ? 'bg-green-100 text-green-800'
                  : networkStatus === 'wrong'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {networkStatus === 'correct' && '✓ Edgen Chain'}
                {networkStatus === 'wrong' && '⚠ Wrong Network'}
                {networkStatus === 'unknown' && '? Unknown Network'}
              </div>
            </div>

            <div className="flex space-x-2">
              {networkStatus === 'wrong' && (
                <button
                  onClick={switchToEdgenChain}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors text-sm"
                >
                  Switch Network
                </button>
              )}
              <button
                onClick={disconnectWallet}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
