import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Today', icon: '○' },
  { path: '/archive', label: 'Archive', icon: '◫' },
  { path: '/goals', label: 'Goals', icon: '✦' },
  { path: '/stats', label: 'Stats', icon: '◈' },
]

export default function Sidebar() {
  return (
    <aside
      className="texture-paper flex flex-col h-full"
      style={{
        width: '200px',
        minWidth: '200px',
        background: '#F5EDE0',
        borderRight: '1px solid rgba(201, 184, 232, 0.3)',
      }}
    >
      {/* Logo */}
      <div className="px-5 py-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌙</span>
          <span
            className="font-display text-xl font-semibold"
            style={{ color: '#3D3250' }}
          >
            Luna
          </span>
        </div>
        <p className="text-xs mt-1" style={{ color: '#8B7D9B', fontFamily: 'DM Sans, sans-serif' }}>
          your quiet space
        </p>
      </div>

      {/* Celestial divider */}
      <div className="celestial-divider mx-4 mb-3 text-xs">✦</div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 no-underline ${
                isActive
                  ? 'bg-[#C9B8E8]/30 text-[#3D3250]'
                  : 'text-[#8B7D9B] hover:bg-[#C9B8E8]/15 hover:text-[#3D3250]'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Settings at bottom */}
      <div className="p-3 border-t" style={{ borderColor: 'rgba(201, 184, 232, 0.2)' }}>
        <button
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-all duration-150"
          style={{ color: '#8B7D9B' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(201, 184, 232, 0.15)'
            e.currentTarget.style.color = '#3D3250'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = ''
            e.currentTarget.style.color = '#8B7D9B'
          }}
        >
          <span>⚙</span>
          <span>Settings</span>
        </button>
      </div>
    </aside>
  )
}
