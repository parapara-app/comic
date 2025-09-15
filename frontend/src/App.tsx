import Header from './components/Header'
import Content from './components/Content'
import Footer from './components/Footer'
import BottomNavigation from './components/BottomNavigation'

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