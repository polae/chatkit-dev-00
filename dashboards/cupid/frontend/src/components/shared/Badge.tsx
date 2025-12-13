import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
}

const variants = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-green-500/20 text-green-500',
  warning: 'bg-yellow-500/20 text-yellow-500',
  error: 'bg-red-500/20 text-red-500',
  info: 'bg-blue-500/20 text-blue-500',
}

export default function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        variants[variant]
      )}
    >
      {children}
    </span>
  )
}
