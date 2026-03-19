interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'accent'
}

export function Card({ children, className = '', variant = 'default' }: CardProps) {
  const base = 'rounded-xl p-4 texture-paper'
  const variants = {
    default: 'bg-[#F5EDE0] border border-[#C9B8E8]/30',
    accent: 'bg-[#C9B8E8]/20 border border-[#C9B8E8]/50',
  }
  return (
    <div className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </div>
  )
}
