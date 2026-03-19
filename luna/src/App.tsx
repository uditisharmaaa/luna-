import { HashRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Today from './pages/Today'
import Archive from './pages/Archive'
import Goals from './pages/Goals'
import Stats from './pages/Stats'

export default function App() {
  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden" style={{ background: '#FFF8F0' }}>
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/stats" element={<Stats />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
