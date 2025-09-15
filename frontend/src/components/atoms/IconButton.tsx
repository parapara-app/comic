import type { ReactNode } from 'react'

interface IconButtonProps {
  onClick?: () => void
  children: ReactNode
  className?: string
  ariaLabel?: string
}

export default function IconButton({ onClick, children, className = "", ariaLabel }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}