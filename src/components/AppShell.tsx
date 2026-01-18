'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Header from './Header'

interface AppShellProps {
  children: React.ReactNode
}

// Auth pages that should not show the sidebar/header
const authPages = ['/login', '/register']

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Check if current page is an auth page
  const isAuthPage = authPages.includes(pathname)

  // Load saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setCollapsed(JSON.parse(saved))
    }
  }, [])

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleToggle = () => {
    const newValue = !collapsed
    setCollapsed(newValue)
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newValue))
  }

  const handleMobileToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  // For auth pages, render without shell
  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-surface-100">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        collapsed={collapsed}
        onToggle={handleToggle}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Header
        sidebarCollapsed={collapsed}
        onMobileMenuClick={handleMobileToggle}
      />

      {/* Main content */}
      <main
        className={`pt-16 min-h-screen transition-all duration-300 ${
          collapsed ? 'md:pl-16' : 'md:pl-56'
        } pl-0`}
      >
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
