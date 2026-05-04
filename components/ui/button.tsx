'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50',
        {
          'bg-indigo-600 text-white hover:bg-indigo-700': variant === 'primary',
          'hover:bg-gray-100 text-gray-700': variant === 'ghost',
          'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50': variant === 'outline',
          'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
        },
        {
          'h-7 px-2 text-xs gap-1': size === 'sm',
          'h-9 px-3 text-sm gap-1.5': size === 'md',
          'h-11 px-4 text-base gap-2': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
