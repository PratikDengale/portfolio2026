import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText)

export { gsap, useGSAP }

export const EASE = 'expo.out'
// clamp() keeps the start reachable for elements near the end of the page.
const START = 'clamp(top 88%)'
export const MOTION_OK = '(prefers-reduced-motion: no-preference)'

// Scroll-triggered reveals for every element marked with data-reveal:
//   head     section head: the rule draws in from the left, the label rises
//   media    media tile: unveiled upwards with a slight zoom-out
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
      const onScroll = (trigger) => ({ trigger, start: START, once: true })

      for (const head of all('head')) {
        gsap
          .timeline({ scrollTrigger: onScroll(head) })
          .from(head, { '--rule-scale': 0, duration: 1.4, ease: 'expo.inOut' })
          .from(head.firstElementChild, { y: 14, autoAlpha: 0, duration: 1, ease: EASE }, 0.15)
      }

      // The tile inside a media wrapper is replaced when the CMS content
      // arrives, so it is looked up when the reveal runs, not before.
      const media = all('media')
      gsap.set(media, { clipPath: 'inset(100% 0% 0% 0%)' })
      ScrollTrigger.batch(media, {
        start: START,
        once: true,
        onEnter: (batch) => {
          gsap.to(batch, {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 1.3,
            ease: EASE,
            stagger: 0.12,
            clearProps: 'clipPath',
          })
          gsap.fromTo(
            batch.map((wrapper) => wrapper.firstElementChild),
            { scale: 1.12 },
            { scale: 1, duration: 1.6, ease: EASE, stagger: 0.12, clearProps: 'transform' },
          )
        },
      })

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
    })
  })
}

