import type { ReactNode } from 'react'

interface ContentProps {
  children?: ReactNode
}

export default function Content({ children }: ContentProps) {
  return (
    <main className="flex-1 pt-14 pb-20 px-4 overflow-y-auto">
      {children || (
        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Sample comic cards for demonstration */}
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="aspect-[3/4] bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
              <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                Comic {item}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}