import Header from '@/components/organisms/Header'
import Content from '@/components/organisms/Content'
import Footer from '@/components/organisms/Footer'
import BottomNavigation from '@/components/organisms/BottomNavigation'

function App() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />
      <Content />
      <Footer />
      <BottomNavigation />
    </div>
  )
}

export default App