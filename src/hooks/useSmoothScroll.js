import Lenis from 'lenis'
import { useEffect } from 'react'
import { usePrefersReducedMotion } from './useMediaQuery'
import { gsap, ScrollTrigger } from './useReveal'

// Smooth scrolling (Lenis) for the mouse wheel and trackpad; touch and the
// keyboard scroll natively. Lenis moves the page's real scroll position frame
// by frame, so the CSS scroll timelines and the observers follow it as they
// would any scroll, and ScrollTrigger is told on every frame. Off with Reduce
// Motion, which gets the browser's own scrolling.
let lenis = null
let held = false

// lerp: the share of the remaining distance covered each frame (at 60fps),
// so lower settles slower; 0.08 is about 95% there in 0.6s. wheelMultiplier:
// how far each wheel step goes, against the browser's own distance.
const SMOOTH = { lerp: 0.08, wheelMultiplier: 1.2 }

// Holds the page still (while the preloader plays), or lets it go.
export function holdScroll(hold) {
  held = hold
  if (hold) lenis?.stop()
  else lenis?.start()
}

export function useSmoothScroll() {
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (reducedMotion) return
    const instance = new Lenis({ ...SMOOTH, autoRaf: false })
    lenis = instance
    if (held) instance.stop()
    instance.on('scroll', ScrollTrigger.update)
    const tick = (time) => instance.raf(time * 1000)
    gsap.ticker.add(tick)

    // Links to a part of this page glide there instead of jumping; Lenis
    // stops them below the frosted strip, as the page's scroll-padding says.
    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = event.target.closest?.('a[href^="#"]')
      const id = link && decodeURIComponent(link.hash.slice(1))
      if (!id || !document.getElementById(id)) return
      event.preventDefault()
      instance.scrollTo(`#${CSS.escape(id)}`)
      window.history.pushState(null, '', `#${id}`)
    }
    document.addEventListener('click', onClick)

    return () => {
      document.removeEventListener('click', onClick)
      gsap.ticker.remove(tick)
      instance.destroy()
      if (lenis === instance) lenis = null
    }
  }, [reducedMotion])
}
