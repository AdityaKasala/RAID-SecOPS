import React from 'react'
import { cn } from '../../lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  flush?: boolean
}

export function Card({ children, className, flush }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl shadow-sm',
        flush ? '' : 'p-5',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  right,
}: {
  title: string
  right?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-[13px] font-semibold text-gray-900">{title}</h3>
      {right && <div>{right}</div>}
    </div>
  )
}

export function FieldGroup({
  cols = 3,
  children,
  className,
}: {
  cols?: 2 | 3
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid gap-4',
        cols === 3 ? 'grid-cols-3' : 'grid-cols-2',
        'max-sm:grid-cols-2',
        className
      )}
    >
      {children}
    </div>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-[12px] font-semibold text-gray-900">{children}</div>
    </div>
  )
}
