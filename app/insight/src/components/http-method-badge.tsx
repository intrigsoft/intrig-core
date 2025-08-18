import React from 'react';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | string;

export interface HttpMethodBadgeProps {
  method: string;
  variant?: 'solid' | 'subtle';
  className?: string;
}

export function HttpMethodBadge({ 
  method, 
  variant = 'subtle', 
  className = '' 
}: HttpMethodBadgeProps) {
  const normalizedMethod = method.toUpperCase();
  
  const getMethodStyles = () => {
    const baseClasses = 'text-xs px-2 py-1 rounded-md font-medium';
    
    if (variant === 'solid') {
      // Solid variant with colored background and white text
      switch (normalizedMethod) {
        case 'GET':
          return `${baseClasses} bg-blue-600 text-white`;
        case 'POST':
          return `${baseClasses} bg-green-600 text-white`;
        case 'PUT':
          return `${baseClasses} bg-yellow-600 text-white`;
        case 'DELETE':
          return `${baseClasses} bg-red-600 text-white`;
        case 'PATCH':
          return `${baseClasses} bg-purple-600 text-white`;
        default:
          return `${baseClasses} bg-gray-600 text-white`;
      }
    } else {
      // Subtle variant with light background and colored text
      switch (normalizedMethod) {
        case 'GET':
          return `${baseClasses} bg-blue-100 text-blue-700`;
        case 'POST':
          return `${baseClasses} bg-green-100 text-green-700`;
        case 'PUT':
          return `${baseClasses} bg-amber-100 text-amber-700`;
        case 'DELETE':
          return `${baseClasses} bg-red-100 text-red-700`;
        case 'PATCH':
          return `${baseClasses} bg-purple-100 text-purple-700`;
        default:
          return `${baseClasses} bg-gray-100 text-gray-700`;
      }
    }
  };

  return (
    <span className={`${getMethodStyles()} ${className}`}>
      {normalizedMethod}
    </span>
  );
}