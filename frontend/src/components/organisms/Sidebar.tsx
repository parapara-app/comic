import { motion, AnimatePresence } from 'framer-motion'
import { HiX, HiHome, HiTag, HiBookOpen, HiHeart, HiClock, HiCog } from 'react-icons/hi'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-40"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.nav
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-800 shadow-xl z-50"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Menu</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-200"
                >
                  <HiX className="w-6 h-6" />
                </button>
              </div>

              <nav className="space-y-2">
                <a href="#" className="flex items-center space-x-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-200">
                  <HiHome className="w-5 h-5" />
                  <span>Home</span>
                </a>

                <a href="#" className="flex items-center space-x-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-200">
                  <HiTag className="w-5 h-5" />
                  <span>Categories</span>
                </a>

                <a href="#" className="flex items-center space-x-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-200">
                  <HiBookOpen className="w-5 h-5" />
                  <span>Library</span>
                </a>

                <a href="#" className="flex items-center space-x-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-200">
                  <HiHeart className="w-5 h-5" />
                  <span>Favorites</span>
                </a>

                <a href="#" className="flex items-center space-x-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-200">
                  <HiClock className="w-5 h-5" />
                  <span>History</span>
                </a>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <a href="#" className="flex items-center space-x-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-200">
                    <HiCog className="w-5 h-5" />
                    <span>Settings</span>
                  </a>
                </div>
              </nav>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  )
}