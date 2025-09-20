import { useState } from 'react'
import { HiMenu, HiSearch, HiSun, HiMoon } from 'react-icons/hi'
import IconButton from '@/components/atoms/IconButton'
import Sidebar from '@/components/organisms/Sidebar'
import { useTheme } from '@/contexts/ThemeContext'

interface HeaderProps {
  title?: string
}

export default function Header({ title = "Parapara Comic" }: HeaderProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()


  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 z-30 transition-colors">
        <IconButton onClick={() => setSidebarOpen(true)} ariaLabel="Open menu">
          <HiMenu className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        </IconButton>

        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h1>

        <div className="flex items-center space-x-1">
          <IconButton onClick={toggleTheme} ariaLabel="Toggle dark mode">
            {theme === 'dark' ? (
              <HiSun className="w-5 h-5 text-yellow-400" />
            ) : (
              <HiMoon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            )}
          </IconButton>

          <IconButton ariaLabel="Search">
            <HiSearch className="w-6 h-6 text-gray-700 dark:text-gray-200" />
          </IconButton>
        </div>
      </header>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  )
}