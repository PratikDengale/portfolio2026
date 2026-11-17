import { useRef } from 'react'
import { site } from '../data/content'
import { useContent } from '../hooks/useContent'
import { useFitText } from '../hooks/useFitText'
import { markIntroDone } from '../hooks/useIntro'
import { holdScroll } from '../hooks/useSmoothScroll'
import { EASE, gsap, MOTION_OK, SplitText, useGSAP } from '../hooks/useReveal'
import { useVideoPlayback } from '../hooks/useVideoPlayback'
import MenuButton from './MenuButton'
import RecDot from './RecDot'
import styles from './Hero.module.css'

// Splits the wordmark into characters without losing the font's kerning:
// each character is nudged back to where it sat in the unsplit text, so the
// edge-to-edge fit holds while it animates. Revert the split afterwards.
function splitKeepingKerning(element) {
  const text = element.firstChild
  const range = document.createRange()
  const lefts = []
  for (let i = 0; i < text.length; i++) {
    if (/\s/.test(text.data[i])) continue
    range.setStart(text, i)
    range.setEnd(text, i + 1)
    lefts.push(range.getBoundingClientRect().left)
  }
  const split = SplitText.create(element, { type: 'chars' })
  split.chars.forEach((char, i) => gsap.set(char, { x: lefts[i] - char.getBoundingClientRect().left }))
  return split
}

let canvas

// Ink (glyph outline) extent of one character set in `style`: left and right
// from its pen position, and its height above the baseline.
function inkOf(char, style) {
  canvas ??= document.createElement('canvas').getContext('2d')
  canvas.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  const m = canvas.measureText(char)
  return { left: -m.actualBoundingBoxLeft, right: m.actualBoundingBoxRight, ascent: m.actualBoundingBoxAscent }
}

// Viewport y of an element's (single-line) baseline: an empty inline-block
// sits on it.
function baselineOf(element) {
  const probe = document.createElement('span')
  probe.style.cssText = 'display: inline-block; width: 0; height: 0'
  element.append(probe)
  const y = probe.getBoundingClientRect().top
  probe.remove()
  return y
}

// The preloader: the wordmark plays it itself, so the letters that form in
// the middle of the blank screen are the very ones that end up in the hero.
// Seconds the blank screen holds before the preloader begins.
const PRELOAD_DELAY = 1
// Times in seconds from the start. The parting and landing ease in and out
// slowly, so each begins just before the step before it visibly settles:
// one runs on into the next without a pause.
const PRELOAD = {
  initials: 0.1, // P rises and D drops into the middle
  name: 1.25, // they part to their places as the rest of the name unfolds
  land: 2.35, // the blank screen parts under the name like a curtain as it grows into the hero
}
// P and D's way in: how far each travels (px on screen) and for how long.
const INITIALS_IN = { travel: 200, duration: 1.8 }
// Seconds the name takes to grow into its place in the hero. The bar's
// entrance keeps pace with it.
const LANDING = 2.3
// The blank screen, split just under the name (where the hero's bottom edge
// is in the scaled-down hero), opens like a curtain with the landing, at its
// pace: the part above rises off the top, while the part below, with the
// name standing on it, rides down to the hero's bottom edge. Once the name
// has landed, that part drops away off the bottom of the screen.
const CURTAIN_DROP = { duration: 0.9, ease: 'power3.inOut' }
// P and D parting to their places in the name. `unfold`: how far through the
// parting the last letters on each side appear (letters under an initial
// wait for it to move off them).
const PARTING = { duration: 1.6, ease: 'expo.inOut', unfold: 0.85 }
// The name's size in the middle of the screen, as a share of the window's width.
const PRELOAD_SIZE = { share: 0.045, min: 28, max: 72 }
// Space between P and D while they're side by side, in em.
const INITIALS_GAP = 0.36

// Parallax: how far the showreel lags behind the page as it scrolls away
// (0.5: it moves at half the page's speed).
const PARALLAX = 0.5

export default function Hero({ menuOpen, onOpenMenu }) {
  const { name, roles } = site
  const { reel } = useContent()
  // The showreel has no controls: it plays muted while any of its window shows
  // (it lags behind the page, see PARALLAX), and with Reduce Motion on it
  // stays on its poster.
  const reelWindow = useRef(null)
  const reelLayer = useRef(null)
  const [reelRef, playback] = useVideoPlayback('reel', reel.src, {
    watch: reelWindow,
    share: 0,
  })

  // The wordmark's ink is pinned to the outer ink edges of the roles row.
  const firstRole = useRef(null)
  const lastRole = useRef(null)
  const hero = useRef(null)
  const bar = useRef(null)
  const playIntro = useRef(null)
  const wordmark = useFitText(name, { alignStart: firstRole, alignEnd: lastRole, onFitted: playIntro })

  // Intro: the preloader (see PRELOAD), then the roles and the top bar fade
  // in. The clock starts once the wordmark has its font and size; until then
  // the screen stays blank. Skipped for a link to a section further down.
  const preloader = useRef(null)
  const bottom = useRef(null)
  const introPlayed = useRef(false)
  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, (context) => {
        // Parallax: as the hero scrolls away, the showreel is pushed down by
        // PARALLAX of the distance, so on screen it moves slower than the page.
        // The layer stays the same element when the CMS swaps the video in.
        gsap.to(reelLayer.current, {
          y: () => hero.current.offsetHeight * PARALLAX,
          ease: 'none',
          scrollTrigger: {
            trigger: hero.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
            invalidateOnRefresh: true,
          },
        })

        const hash = decodeURIComponent(window.location.hash.slice(1))
        if (introPlayed.current || (hash && hash !== 'top')) {
          gsap.set(preloader.current, { autoAlpha: 0 })
          markIntroDone()
          return
        }

        const roles = [...firstRole.current.parentElement.children]
        gsap.set([...roles, bar.current], { autoAlpha: 0 })

        // The page holds still under the preloader, at the top.
        window.history.scrollRestoration = 'manual'
        window.scrollTo(0, 0)
        const hold = (event) => event.preventDefault()
        const holdKeys = (event) =>
          ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key) &&
          event.preventDefault()
        holdScroll(true)
        window.addEventListener('wheel', hold, { passive: false })
        window.addEventListener('touchmove', hold, { passive: false })
        window.addEventListener('keydown', holdKeys)
        // Scrolling comes back once the curtain is gone, while the bar is
        // still fading in.
        const letScroll = () => {
          holdScroll(false)
          window.removeEventListener('wheel', hold)
          window.removeEventListener('touchmove', hold)
          window.removeEventListener('keydown', holdKeys)
        }
        const release = () => {
          letScroll()
          window.removeEventListener('resize', skipToEnd)
        }
        let intro = null
        // Measurements don't survive a resize; land the name at once.
        const skipToEnd = () => intro?.progress(1)
        window.addEventListener('resize', skipToEnd)

        // Named, so add() hands back the wrapped function instead of running it
        // now. Runs once, however often the font reports in.
        let started = false
        const start = context.add('playIntro', () => {
          if (started) return
          started = true
          const heading = wordmark.current
          const split = splitKeepingKerning(heading)
          const { chars } = split
          // Where each character sits in the hero, in the heading's own px
          // (from its left edge, before any scaling): its kerning nudge, and
          // its ink.
          const kerning = chars.map((char) => gsap.getProperty(char, 'x'))
          const box = heading.getBoundingClientRect()
          const style = getComputedStyle(heading)
          const size = parseFloat(style.fontSize)
          const ink = chars.map((char) => {
            const glyph = inkOf(char.textContent, style)
            const left = char.getBoundingClientRect().left - box.left
            return { left: left + glyph.left, right: left + glyph.right, ascent: glyph.ascent }
          })
          const width = (i) => ink[i].right - ink[i].left

          // The initials: the first character of each word.
          const initials = []
          let index = 0
          for (let i = 0; i < name.length; i++) {
            if (/\s/.test(name[i])) continue
            if (i === 0 || /\s/.test(name[i - 1])) initials.push(index)
            index++
          }
          const [p, d] = [initials[0], initials[initials.length - 1]]

          // The heading, scaled down with its top-left corner as the origin
          // and moved so the name's ink is centred across the window and the
          // capitals' height is centred down it. Landing undoes exactly this.
          const viewport = document.documentElement
          const target = gsap.utils.clamp(PRELOAD_SIZE.min, PRELOAD_SIZE.max, viewport.clientWidth * PRELOAD_SIZE.share)
          const scale = Math.min(1, target / size)
          const centre = (Math.min(...ink.map((i) => i.left)) + Math.max(...ink.map((i) => i.right))) / 2
          const capsMiddle = baselineOf(heading) - box.top - Math.max(ink[p].ascent, ink[d].ascent) / 2
          const moved = {
            x: viewport.clientWidth / 2 - box.left - scale * centre,
            y: viewport.clientHeight / 2 - box.top - scale * capsMiddle,
          }
          gsap.set(heading, { transformOrigin: '0 0', scale, ...moved })
          // Where a point of the hero (on screen, as it ends up) is while the
          // heading is scaled down in the middle.
          const preloaded = (x, y) => ({
            x: box.left + moved.x + scale * (x - box.left),
            y: box.top + moved.y + scale * (y - box.top),
          })

          // P and D side by side with the gap between them on the name's
          // centre, so in the middle of the window.
          const gap = INITIALS_GAP * size
          const pairLeft = centre - gap / 2 - width(p)
          const shift = { [p]: pairLeft - ink[p].left, [d]: pairLeft + width(p) + gap - ink[d].left }
          gsap.set(chars, { autoAlpha: 0 })
          gsap.set([chars[p], chars[d]], { x: (i) => kerning[[p, d][i]] + shift[[p, d][i]] })

          // Where the hero's bottom edge is in the scaled-down hero: just under
          // the name.
          const heroBottom = hero.current.getBoundingClientRect().bottom
          const under = preloaded(0, heroBottom).y
          // The blank screen in two parts, meeting there (overlapping by a
          // pixel, so no seam shows).
          const [upper, lower] = preloader.current.children
          gsap.set(upper, { height: under + 0.5 })
          gsap.set(lower, { top: under - 0.5 })

          // As P and D part, the other letters appear in place, from the
          // middle outwards, each only once neither initial is over it, so
          // nothing ever overlaps: the name unfolds from between them.
          // `reach` is how far through the parting (0 to 1, eased) that is.
          const parting = gsap.parseEase(PARTING.ease)
          const timeAt = (reach) => {
            let [early, late] = [0, 1]
            for (let step = 0; step < 20; step++) {
              const mid = (early + late) / 2
              if (parting(mid) < reach) early = mid
              else late = mid
            }
            return late * PARTING.duration
          }
          // The furthest letter from the middle on each side appears last.
          const middleOf = (i) => (ink[i].left + ink[i].right) / 2
          const rest = chars.map((_, i) => i).filter((i) => i !== p && i !== d)
          const furthest = { left: 0, right: 0 }
          for (const i of rest) {
            const side = middleOf(i) < centre ? 'left' : 'right'
            furthest[side] = Math.max(furthest[side], Math.abs(middleOf(i) - centre))
          }
          // Not while an initial is still over the letter's middle.
          const clearOf = (i) => {
            const middle = middleOf(i)
            let reach = 0
            for (const j of [p, d]) {
              const from = ink[j].left + shift[j]
              const to = ink[j].left
              if (from === to) continue
              // How far through the parting the initial's left and right edges cross the middle.
              const edges = [(middle - from) / (to - from), (middle - width(j) - from) / (to - from)]
              const [enters, leaves] = edges.sort((a, b) => a - b)
              if (leaves > 0 && enters < 1) reach = Math.max(reach, Math.min(leaves, 1))
            }
            return reach
          }
          const reachOf = (i) => {
            const side = middleOf(i) < centre ? 'left' : 'right'
            return Math.max((PARTING.unfold * Math.abs(middleOf(i) - centre)) / (furthest[side] || 1), clearOf(i))
          }
          // D's word unfolds from its right end back towards D, in step with
          // P's word: its last letter appears with P's first, its first letter
          // (which D starts out over) with P's last.
          const leftReaches = rest.filter((i) => middleOf(i) < centre).map(reachOf)
          const rightMiddles = rest.filter((i) => middleOf(i) >= centre).map(middleOf)
          const [soonest, latest] = [Math.min(...leftReaches), Math.max(...leftReaches)]
          const [nearD, farEnd] = [Math.min(...rightMiddles), Math.max(...rightMiddles)]
          const revealReach = (i) => {
            if (middleOf(i) < centre || !leftReaches.length) return reachOf(i)
            const fromEnd = (farEnd - middleOf(i)) / (farEnd - nearD || 1)
            return Math.max(soonest + (latest - soonest) * fromEnd, clearOf(i))
          }
          // Over the blank screen while it lasts.
          gsap.set(bottom.current, { zIndex: 11 })
          // The travel on screen, whatever the scale.
          const rise = INITIALS_IN.travel / scale

          // Only a preloader that ran to the end counts as played; one cut off
          // (by a remount, or Reduce Motion switched on and off) plays again.
          const finish = () => {
            introPlayed.current = true
            markIntroDone()
            split.revert()
            gsap.set(heading, { clearProps: 'transform,transformOrigin' })
            gsap.set(bottom.current, { clearProps: 'zIndex' })
            release()
          }
          intro = gsap
            .timeline({ delay: PRELOAD_DELAY, defaults: { ease: EASE }, onComplete: finish })
            // 1. P rises and D drops into the middle.
            .from(chars[p], { y: rise, duration: INITIALS_IN.duration, ease: 'power3.out' }, PRELOAD.initials)
            .from(chars[d], { y: -rise, duration: INITIALS_IN.duration, ease: 'power3.out' }, PRELOAD.initials)
            .to([chars[p], chars[d]], { autoAlpha: 1, duration: INITIALS_IN.duration * 0.75, ease: 'power1.out' }, PRELOAD.initials)
            // 2. They part to their places in the name, and the rest of it
            //    unfolds between and beside them.
            .to([chars[p], chars[d]], { x: (i) => kerning[[p, d][i]], duration: PARTING.duration, ease: PARTING.ease }, PRELOAD.name)
          for (const i of rest) {
            intro.fromTo(
              chars[i],
              { autoAlpha: 0, filter: `blur(${8 / scale}px)` },
              { autoAlpha: 1, filter: 'blur(0px)', duration: 0.6, ease: 'power2.out', clearProps: 'filter' },
              PRELOAD.name + Math.max(0, timeAt(revealReach(i)) - 0.08),
            )
          }
          intro
            // 3. The name grows into place in the hero; the blank screen parts
            //    under it in step, the top rising and the bottom riding down
            //    under the name, then dropping away. The roles and the bar
            //    follow.
            .to(heading, { x: 0, y: 0, scale: 1, duration: LANDING, ease: 'expo.inOut' }, PRELOAD.land)
            .to(upper, { yPercent: -100, duration: LANDING, ease: 'expo.inOut' }, PRELOAD.land)
            .to(lower, { y: heroBottom - under, duration: LANDING, ease: 'expo.inOut' }, PRELOAD.land)
            // (as the landing settles, taking over from the ride down) the
            // lower part drops away off the bottom of the screen.
            .to(lower, { y: viewport.clientHeight - under + 0.5, overwrite: 'auto', ...CURTAIN_DROP }, PRELOAD.land + LANDING * 0.76)
            .set(preloader.current, { autoAlpha: 0, onComplete: letScroll }, PRELOAD.land + LANDING * 0.76 + CURTAIN_DROP.duration)
            .to(roles, { autoAlpha: 1, duration: 1, stagger: 0.03 }, PRELOAD.land + LANDING * 0.7)
            .from(roles, { y: 16, duration: 1, stagger: 0.03 }, PRELOAD.land + LANDING * 0.7)
            .to(bar.current, { autoAlpha: 1, duration: 1 }, PRELOAD.land + LANDING * 0.85)
        })

        if (wordmark.current.hasAttribute('data-fitted')) start()
        else playIntro.current = start
        return () => {
          playIntro.current = null
          release()
        }
      })
    },
    { scope: hero },
  )

  return (
    <header id="top" className={styles.hero} ref={hero}>
      {/* The window moves with the hero; the layer inside it carries the
          showreel and lags behind (see PARALLAX). */}
      <div className={styles.reelWindow} ref={reelWindow}>
        <div className={styles.reelLayer} ref={reelLayer}>
          {reel.src ? (
            <video
              ref={reelRef}
              className={styles.reel}
              src={reel.src}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={reel.poster ?? undefined}
              aria-hidden="true"
            />
          ) : (
            reel.poster && <img className={styles.reel} src={reel.poster} alt="" />
          )}
        </div>
      </div>

      {/* Fades the showreel into the page below, behind the wordmark. */}
      <div className={styles.fade} aria-hidden="true" />
      {/* Shades the top of the showreel, behind the bar. */}
      <div className={styles.topFade} aria-hidden="true" />

      <div className={styles.bar} ref={bar}>
        <div className={styles.reelControls}>
          {/* The dot blinks while the showreel plays. */}
          <RecDot still={Boolean(reel.src) && !playback.playing} />
        </div>
        <div className={styles.menu}>
          <MenuButton expanded={menuOpen} onClick={onOpenMenu} />
        </div>
      </div>

      {/* The preloader's blank screen, in two parts that open like a
          curtain; the wordmark plays over it. */}
      <div className={styles.preloader} ref={preloader} aria-hidden="true">
        <div />
        <div />
      </div>

      <div className={styles.bottom} ref={bottom}>
        <ul className={`mono-ui ${styles.roles}`} aria-label="Roles">
          {roles.map((role, i) => (
            <li key={role} ref={i === 0 ? firstRole : i === roles.length - 1 ? lastRole : undefined}>
              {role}
            </li>
          ))}
        </ul>
        <div className={styles.wordmarkWrap}>
          <h1 ref={wordmark} className={styles.wordmark}>
            {name}
          </h1>
        </div>
      </div>
    </header>
  )
}
