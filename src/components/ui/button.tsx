'use client'

import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:pointer-events-none disabled:opacity-50',
          variant === 'primary' && 'bg-neutral-900 text-white hover:bg-neutral-800',
          variant === 'secondary' && 'border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50',
          variant === 'ghost' && 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100',
          size === 'sm' && 'h-9 px-4 text-sm rounded-md',
          size === 'md' && 'h-11 px-6 text-sm rounded-md',
          size === 'lg' && 'h-12 px-8 text-base rounded-md',
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
export { Button }
