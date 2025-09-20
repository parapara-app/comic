import type { ReactElement } from 'react'
import { HiHome, HiTag, HiBookOpen, HiUser } from 'react-icons/hi'

interface NavItem {
  icon: ReactElement
  label: string
  active?: boolean
}

export default function BottomNavigation() {
  const navItems: NavItem[] = [
    {
      icon: <HiHome className="w-6 h-6" />,
      label: "Home",
      active: true
    },
    {
      icon: <HiTag className="w-6 h-6" />,
      label: "Category"
    },
    {
      icon: <HiBookOpen className="w-6 h-6" />,
      label: "Library"
    },
    {
      icon: <HiUser className="w-6 h-6" />,
      label: "Profile"
    }
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item, index) => (
          <button
            key={index}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
              item.active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {item.icon}
            <span className="text-xs">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}