import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  variant?: 'default' | 'white' | 'dark';
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  className = '', 
  showText = false,
  variant = 'default'
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  const textColorClasses = {
    default: 'bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent',
    white: 'text-white',
    dark: 'text-gray-900'
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Logo Image */}
      <div className="flex-shrink-0">
        <img
          src="/logo.svg"
          alt="Edgen Factory Logo"
          className={`${sizeClasses[size]} transition-transform hover:scale-105`}
        />
      </div>
      
      {/* Logo Text */}
      {showText && (
        <div className="min-w-0">
          <h1 className={`font-bold truncate ${textSizeClasses[size]} ${textColorClasses[variant]}`}>
            Edgen Factory
          </h1>
        </div>
      )}
    </div>
  );
};

export default Logo;
