'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Header from './Header'

interface AppShellProps {
  children: React.ReactNode
}

// Auth pages that should not show the sidebar/header
const authPages = ['/login', '/register']

const MIN_WIDTH = 64
const DEFAULT_WIDTH = 224 // w-56 = 14rem = 224px
const MAX_WIDTH = 400

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Check if current page is an auth page
  const isAuthPage = authPages.includes(pathname)

  const collapsed = sidebarWidth <= MIN_WIDTH

  // Load saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-width')
    if (saved !== null) {
      setSidebarWidth(parseInt(saved))
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

  // Handle mouse move during resize
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return
    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX))
    setSidebarWidth(newWidth)
  }, [isResizing])

  // Handle mouse up to stop resizing
  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false)
      localStorage.setItem('sidebar-width', sidebarWidth.toString())
    }
  }, [isResizing, sidebarWidth])

  // Add/remove event listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  const handleResizeStart = () => {
    setIsResizing(true)
  }

  const handleToggle = () => {
    const newWidth = collapsed ? DEFAULT_WIDTH : MIN_WIDTH
    setSidebarWidth(newWidth)
    localStorage.setItem('sidebar-width', newWidth.toString())
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
        width={sidebarWidth}
        onToggle={handleToggle}
        onResizeStart={handleResizeStart}
        isResizing={isResizing}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Header
        sidebarWidth={sidebarWidth}
        onMobileMenuClick={handleMobileToggle}
      />

      {/* Main content - sidebar offset applied via CSS for responsive handling */}
      <style>{`
        @media (min-width: 768px) {
          .main-content { padding-left: ${sidebarWidth}px !important; }
        }
      `}</style>
      <main
        className={`main-content pt-16 min-h-screen pl-0 ${isResizing ? '' : 'transition-all duration-300'}`}
      >
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
