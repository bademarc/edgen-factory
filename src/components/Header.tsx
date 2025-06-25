import React from 'react';
import Logo from './Logo';

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  return (
    <header className={`bg-white shadow-sm border-b ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          {/* Logo and Title Section */}
          <div className="flex items-center space-x-4">
            {/* Logo with Text */}
            <Logo
              size="lg"
              showText={true}
              className="hidden sm:flex"
            />

            {/* Mobile Logo (smaller, no text) */}
            <Logo
              size="md"
              showText={false}
              className="sm:hidden"
            />

            {/* Subtitle */}
            <div className="min-w-0 flex-1 sm:ml-0 ml-3">
              <p className="text-gray-600 text-sm sm:text-base">
                Create ERC-20 tokens on Edgen Chain
              </p>
            </div>
          </div>
          
          {/* Network Info Section */}
          <div className="hidden sm:flex items-center space-x-4">
            <div className="text-right">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">Edgen Chain</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Chain ID: 4207
              </div>
            </div>
            
            {/* Network Badge */}
            <div className="bg-gradient-to-r from-purple-100 to-blue-100 px-3 py-2 rounded-lg border border-purple-200">
              <div className="text-xs font-medium text-purple-700">
                MAINNET
              </div>
            </div>
          </div>
          
          {/* Mobile Network Info */}
          <div className="sm:hidden flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
            <span className="text-sm font-medium text-gray-700">Edgen</span>
          </div>
        </div>
        
        {/* Mobile Network Details */}
        <div className="sm:hidden mt-3 pt-3 border-t border-gray-100">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Chain ID: 4207</span>
            <div className="bg-gradient-to-r from-purple-100 to-blue-100 px-2 py-1 rounded border border-purple-200">
              <span className="text-purple-700 font-medium">MAINNET</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
