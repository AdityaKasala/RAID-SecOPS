import React from 'react'
import { cn } from '../../lib/utils'

type Variant = 'default' | 'primary' | 'danger' | 'amber' | 'violet'
type Size = 'sm' | 'md'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: React.ReactNode
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
  primary: 'bg-[#3b82f6] border-[#3b82f6] text-white hover:bg-[#2563eb]',
  danger: 'bg-red-600 border-red-600 text-white hover:bg-red-700',
  amber: 'bg-amber-600 border-amber-600 text-white hover:bg-amber-700',
  violet: 'bg-violet-600 border-violet-600 text-white hover:bg-violet-700',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-2.5 py-1 text-[11px]',
  md: 'px-3.5 py-1.5 text-[12px]',
}

export function Button({
  variant = 'default',
  size = 'md',
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border font-medium transition-colors active:scale-[.98]',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
