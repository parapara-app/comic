import Header from '@/components/organisms/Header'
import Content from '@/components/organisms/Content'
import Footer from '@/components/organisms/Footer'
import BottomNavigation from '@/components/organisms/BottomNavigation'
import { ThemeProvider } from '@/contexts/ThemeContext'

function App() {
  return (
    <ThemeProvider>
      <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 transition-colors">
        <Header />
        <Content />
        <Footer />
        <BottomNavigation />
      </div>
    </ThemeProvider>
  )
}

export default App