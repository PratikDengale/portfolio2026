import { useState } from 'react'
import About from './components/About'
import ContentProvider from './components/ContentProvider'
import Footer from './components/Footer'
import Hero from './components/Hero'
import MenuOverlay from './components/MenuOverlay'
import SelectedWork from './components/SelectedWork'
import Services from './components/Services'

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <ContentProvider>
      <Hero menuOpen={menuOpen} onOpenMenu={() => setMenuOpen(true)} />
      <main>
        <SelectedWork />
        <Services />
        <About />
      </main>
      <Footer />
      <MenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} />
    </ContentProvider>
  )
}
