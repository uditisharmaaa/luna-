interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  const base = 'rounded-lg font-sans font-medium transition-all duration-150 cursor-pointer border-0 outline-none focus:ring-2 focus:ring-[#C9B8E8]/50'
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
  }
  const variants = {
    primary: 'bg-[#C9B8E8] text-[#3D3250] hover:bg-[#9B8BC8] hover:text-white active:scale-95',
    ghost: 'bg-transparent text-[#8B7D9B] hover:bg-[#C9B8E8]/20 hover:text-[#3D3250] active:scale-95',
    danger: 'bg-[#FFD6E0] text-[#3D3250] hover:bg-rose-300 active:scale-95',
  }
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
