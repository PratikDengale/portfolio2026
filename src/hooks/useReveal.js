import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText)

export { gsap, ScrollTrigger, SplitText, useGSAP }

export const EASE = 'expo.out'
// clamp() keeps the start reachable for elements near the end of the page.
const START = 'clamp(top 88%)'
export const MOTION_OK = '(prefers-reduced-motion: no-preference)'

// Scroll-triggered reveals for every element marked with data-reveal:
//   head     section head: the rule draws in from the left, the label rises
//   media    media tile: rises and comes into focus, from lower, blurred and
//            transparent; tiles entering together follow one another
//   lines    text rises line by line from behind a mask
//   fade     rises and fades in
//   stagger  its children rise and fade in one after another
// Each element animates once, the first time it scrolls into view. Visitors
// who prefer reduced motion get the page as it is, with nothing hidden.
export function useReveal() {
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(MOTION_OK, () => {
      const all = (kind) => gsap.utils.toArray(`[data-reveal="${kind}"]`)
      // Inside a data-reveal-scope, elements don't scroll themselves (they're
      // fixed in place), so the scope's box is what crosses the start line.
      const onScroll = (element) => ({
        trigger: element.closest('[data-reveal-scope]') ?? element,
        start: START,
        once: true,
      })

      for (const head of all('head')) {
        gsap
          .timeline({ scrollTrigger: onScroll(head) })
          .from(head, { '--rule-scale': 0, duration: 1.4, ease: 'expo.inOut' })
          .from(head.firstElementChild, { y: 14, autoAlpha: 0, duration: 1, ease: EASE }, 0.15)
      }

      // The wrapper is animated, not the tile inside it, because the tile is
      // replaced when the CMS content arrives. Watched where it actually is
      // on screen rather than measured once up front, because the work grid's
      // columns drift as the page scrolls. It reveals once its top passes 88%
      // down the window, or at once if the page opened below it. Tiles that
      // arrive within a moment of each other go one after another in reading
      // order (top to bottom, then left to right).
      const media = all('media')
      const reading = (a, b) => {
        const [boxA, boxB] = [a.getBoundingClientRect(), b.getBoundingClientRect()]
        return boxA.top - boxB.top || boxA.left - boxB.left
      }
      gsap.set(media, { y: 64, autoAlpha: 0, filter: 'blur(24px)' })
      let arrived = []
      let timer = null
      const reveal = () => {
        gsap.to(arrived.sort(reading), {
          y: 0,
          autoAlpha: 1,
          filter: 'blur(0px)',
          duration: 1.4,
          ease: EASE,
          stagger: 0.12,
          clearProps: 'filter,transform',
        })
        arrived = []
        timer = null
      }
      const watcher = new IntersectionObserver(
        (entries) => {
          for (const { target, isIntersecting, boundingClientRect } of entries) {
            if (!isIntersecting && boundingClientRect.top > 0) continue // still below
            watcher.unobserve(target)
            arrived.push(target)
          }
          if (arrived.length && !timer) timer = setTimeout(reveal, 100)
        },
        { rootMargin: '0px 0px -12% 0px' },
      )
      media.forEach((tile) => watcher.observe(tile))

      for (const text of all('lines')) {
        SplitText.create(text, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (split) =>
            gsap.from(split.lines, {
              yPercent: 105,
              duration: 1.2,
              ease: EASE,
              stagger: 0.08,
              scrollTrigger: onScroll(text),
            }),
        })
      }

      for (const element of all('fade')) {
        gsap.from(element, { y: 24, autoAlpha: 0, duration: 1.1, ease: EASE, scrollTrigger: onScroll(element) })
      }

      for (const list of all('stagger')) {
        gsap.from(list.children, {
          y: 16,
          autoAlpha: 0,
          duration: 0.9,
          ease: EASE,
          stagger: 0.05,
          scrollTrigger: onScroll(list),
        })
      }

      // Text reflows once the web fonts arrive; re-measure trigger points.
      document.fonts.ready.then(() => ScrollTrigger.refresh())

      return () => {
        watcher.disconnect()
        clearTimeout(timer)
      }
    })
  })
}

