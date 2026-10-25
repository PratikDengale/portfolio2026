import { useLayoutEffect, useState } from 'react'
import About from './components/About'
import ContentProvider from './components/ContentProvider'
import Footer from './components/Footer'
import Frost from './components/Frost'
import Hero from './components/Hero'
import MenuOverlay from './components/MenuOverlay'
import SelectedWork from './components/SelectedWork'
import Services from './components/Services'
import { useReveal } from './hooks/useReveal'

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)

  // Links like /#about: the browser looks for the section before React has
  // drawn it, so jump there once it exists (before the reveals measure).
  useLayoutEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'instant' })
  }, [])
  useReveal()

  return (
    <ContentProvider>
      <Hero menuOpen={menuOpen} onOpenMenu={() => setMenuOpen(true)} />
      <main>
        <SelectedWork />
        <Services />
        <About />
      </main>
      <Footer />
      <Frost />
      <MenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} />
    </ContentProvider>
  )
}
