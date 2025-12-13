import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPICardProps {
  label: string
  value: string | number
  icon: LucideIcon
  iconColor?: string
  subtext?: string
}

export default function KPICard({
  label,
  value,
  icon: Icon,
  iconColor = 'text-primary',
  subtext,
}: KPICardProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg bg-muted', iconColor)}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
          {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
        </div>
      </div>
    </div>
  )
}
