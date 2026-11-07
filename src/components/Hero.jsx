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
  initials: 0.1, // P rises and D drops into the middle, a line drawing in between from the screen's edges
  name: 1.25, // they part to their places as the rest of the name unfolds, and the line swings flat below it
  land: 2.35, // the blank screen parts at the line like a curtain as the name grows into the hero
}
// P and D's way in: how far each travels (px on screen) and for how long.
const INITIALS_IN = { travel: 200, duration: 1.8 }
// The accent line, which ends up fixed along the bottom of the screen,
// starts as the upright line between P and D, drawn in from the top and
// bottom edges of the screen. Over `turn` seconds it swings flat and drops
// below the name, always reaching edge to edge; it lands with the name on
// the hero's bottom edge, then rides the curtain down to the screen's.
const RULE = { turn: 1.4 }
// Seconds the name takes to grow into its place in the hero. The bar's
// entrance keeps pace with it.
const LANDING = 2.3
// The blank screen, split at the flat line, opens like a curtain with the
// landing, at its pace: the part above rises off the top, while the part
// below carries the line, with the name standing on it, down to the hero's
// bottom edge. Once the name has landed, that part drops away, taking the
// line down to the bottom of the screen.
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

  // The wordmark's ink runs edge to edge of its box, gutter to gutter.
  const rolesList = useRef(null)
  const hero = useRef(null)
  const bar = useRef(null)
  const playIntro = useRef(null)
  const wordmark = useFitText(name, { onFitted: playIntro })

  // Intro: the preloader (see PRELOAD), then the roles and the top bar fade
  // in. The clock starts once the wordmark has its font and size; until then
  // the screen stays blank. Skipped for a link to a section further down.
  const preloader = useRef(null)
  const bottom = useRef(null)
  const rule = useRef(null)
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

        const roles = rolesList.current
        // The bar fades in item by item, not as a whole: while an ancestor
        // fades, browsers switch off the roles box's backdrop blur, and it
        // would pop in at the end.
        const barItems = [...bar.current.children].filter((item) => item !== roles)
        gsap.set([roles, ...barItems], { autoAlpha: 0 })

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

          // P and D side by side with the gap between them (where the line
          // runs) on the name's centre, so in the middle of the window.
          const gap = INITIALS_GAP * size
          const pairLeft = centre - gap / 2 - width(p)
          const shift = { [p]: pairLeft - ink[p].left, [d]: pairLeft + width(p) + gap - ink[d].left }
          gsap.set(chars, { autoAlpha: 0 })
          gsap.set([chars[p], chars[d]], { x: (i) => kerning[[p, d][i]] + shift[[p, d][i]] })

          // The rule, 1px thick on screen throughout and always reaching from
          // edge to edge of the screen: first upright through the gap between
          // P and D, its halves growing in from the top and bottom edges; then
          // swinging flat as it drops below the name, to where the hero's
          // bottom edge is in the scaled-down hero, so it lands with the name.
          // Its own place is the bottom of the screen, where it is fixed.
          const line = rule.current
          const halves = [...line.children]
          const lineBox = line.getBoundingClientRect()
          const lineMiddle = { x: lineBox.left + lineBox.width / 2, y: lineBox.top + lineBox.height / 2 }
          const heroEdge = { x: viewport.clientWidth / 2, y: hero.current.getBoundingClientRect().bottom - 0.5 }
          const between = preloaded(box.left + pairLeft + width(p) + gap / 2, box.top + capsMiddle)
          const under = { x: heroEdge.x, y: preloaded(heroEdge.x, heroEdge.y).y }
          // The rule's placement for the line through `point` at `angle`
          // (degrees from flat), cut off at the screen's edges.
          const across = (point, angle) => {
            const radians = (angle * Math.PI) / 180
            const direction = { x: Math.cos(radians), y: Math.sin(radians) }
            let [from, to] = [-Infinity, Infinity]
            for (const [axis, size] of [['x', viewport.clientWidth], ['y', viewport.clientHeight]]) {
              if (Math.abs(direction[axis]) < 1e-6) continue
              const [near, far] = [-point[axis] / direction[axis], (size - point[axis]) / direction[axis]].sort((a, b) => a - b)
              from = Math.max(from, near)
              to = Math.min(to, far)
            }
            // Slanted, its square ends poke past the side edges by up to half its
            // thickness, which would widen the page: pull those ends in.
            const poke = Math.abs(direction.x) > 1e-6 ? (0.5 * Math.abs(direction.y)) / Math.abs(direction.x) : 0
            const atSide = (along) => {
              const x = point.x + along * direction.x
              return x < 0.01 || x > viewport.clientWidth - 0.01
            }
            if (atSide(from)) from += poke
            if (atSide(to)) to -= poke
            const middle = (from + to) / 2
            return {
              x: point.x + middle * direction.x - lineMiddle.x,
              y: point.y + middle * direction.y - lineMiddle.y,
              rotation: angle,
              scaleX: (to - from) / lineBox.width,
            }
          }
          // The blank screen in two parts, meeting where the line lies flat
          // (overlapping by a pixel, behind the line, so no seam shows).
          const [upper, lower] = preloader.current.children
          gsap.set(upper, { height: under.y + 0.5 })
          gsap.set(lower, { top: under.y - 0.5 })

          const turn = { progress: 0 }
          const turnPoint = gsap.utils.interpolate(between, under)
          // Over the blank screen while the preloader plays (it waits under it).
          gsap.set(line, { transformOrigin: '50% 50%', ...across(between, 90), autoAlpha: 0, zIndex: 11 })
          gsap.set(halves, { scaleX: 0, transformOrigin: (i) => (i ? '100% 50%' : '0% 50%') })

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
            gsap.set([line, ...halves], { clearProps: 'transform,transformOrigin,opacity,visibility,zIndex' })
            gsap.set(bottom.current, { clearProps: 'zIndex' })
            release()
          }
          intro = gsap
            .timeline({ delay: PRELOAD_DELAY, defaults: { ease: EASE }, onComplete: finish })
            // 1. P rises and D drops into the middle.
            .from(chars[p], { y: rise, duration: INITIALS_IN.duration, ease: 'power3.out' }, PRELOAD.initials)
            .from(chars[d], { y: -rise, duration: INITIALS_IN.duration, ease: 'power3.out' }, PRELOAD.initials)
            .to([chars[p], chars[d]], { autoAlpha: 1, duration: INITIALS_IN.duration * 0.75, ease: 'power1.out' }, PRELOAD.initials)
            //    The line between them draws in from its ends along with them:
            //    same start, fade and easing, a little quicker, so its halves
            //    have met before it turns.
            .to(line, { autoAlpha: 1, duration: INITIALS_IN.duration * 0.75, ease: 'power1.out' }, PRELOAD.initials)
            .to(halves, { scaleX: 1, duration: INITIALS_IN.duration - 0.5, ease: 'power3.out' }, PRELOAD.initials)
            // 2. They part to their places in the name, and the rest of it
            //    unfolds between and beside them.
            .to([chars[p], chars[d]], { x: (i) => kerning[[p, d][i]], duration: PARTING.duration, ease: PARTING.ease }, PRELOAD.name)
            //    The line swings flat behind them as it drops below the name,
            //    reaching edge to edge all the way.
            .to(
              turn,
              {
                progress: 1,
                duration: RULE.turn,
                ease: 'power3.inOut',
                onUpdate: () => gsap.set(line, across(turnPoint(turn.progress), 90 * (1 - turn.progress))),
              },
              PRELOAD.name,
            )
          for (const i of rest) {
            intro.fromTo(
              chars[i],
              { autoAlpha: 0, filter: `blur(${8 / scale}px)` },
              { autoAlpha: 1, filter: 'blur(0px)', duration: 0.6, ease: 'power2.out', clearProps: 'filter' },
              PRELOAD.name + Math.max(0, timeAt(revealReach(i)) - 0.08),
            )
          }
          intro
            // 3. The name grows into place in the hero and the line moves down
            //    with it to the hero's bottom edge; the blank screen parts at
            //    the line in step, the top rising and the bottom riding down
            //    under the line, then dropping away. The roles and the bar
            //    follow.
            .to(heading, { x: 0, y: 0, scale: 1, duration: LANDING, ease: 'expo.inOut' }, PRELOAD.land)
            .to(line, { y: heroEdge.y - lineMiddle.y, duration: LANDING, ease: 'expo.inOut' }, PRELOAD.land)
            .to(upper, { yPercent: -100, duration: LANDING, ease: 'expo.inOut' }, PRELOAD.land)
            .to(lower, { y: heroEdge.y - under.y, duration: LANDING, ease: 'expo.inOut' }, PRELOAD.land)
            // (as the landing settles, taking over from the ride down) the
            // lower part drops away and the line rides it to the screen's
            // bottom edge, its fixed place.
            .to(lower, { y: viewport.clientHeight - under.y + 0.5, overwrite: 'auto', ...CURTAIN_DROP }, PRELOAD.land + LANDING * 0.76)
            .to(line, { y: 0, overwrite: 'auto', ...CURTAIN_DROP }, PRELOAD.land + LANDING * 0.76)
            .set(preloader.current, { autoAlpha: 0, onComplete: letScroll }, PRELOAD.land + LANDING * 0.76 + CURTAIN_DROP.duration)
            .to(roles, { autoAlpha: 1, duration: 1 }, PRELOAD.land + LANDING * 0.7)
            .from(roles, { y: 16, duration: 1 }, PRELOAD.land + LANDING * 0.7)
            .to(barItems, { autoAlpha: 1, duration: 1 }, PRELOAD.land + LANDING * 0.85)
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
        <ul ref={rolesList} className={`mono-label ${styles.roles}`} aria-label="Roles">
          {roles.map((role) => (
            <li key={role}>{role}</li>
          ))}
        </ul>
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

      {/* The accent line, fixed along the bottom of the screen; the preloader
          draws it. Before the wordmark, so it passes behind the letters. */}
      <span ref={rule} className={styles.rule} aria-hidden="true">
        <span />
        <span />
      </span>

      <div className={styles.bottom} ref={bottom}>
        <div className={styles.wordmarkWrap}>
          <h1 ref={wordmark} className={styles.wordmark}>
            {name}
          </h1>
        </div>
      </div>
    </header>
  )
}
