import { useRef } from 'react'
import { site } from '../data/content'
import { useContent } from '../hooks/useContent'
import { useFitText } from '../hooks/useFitText'
import { EASE, gsap, MOTION_OK, SplitText, useGSAP } from '../hooks/useReveal'
import { useVideoPlayback } from '../hooks/useVideoPlayback'
import MenuButton from './MenuButton'
import RecDot from './RecDot'
import VideoControls from './VideoControls'
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

// Seconds the showreel plays alone before the hero text and bar animate in.
const INTRO_DELAY = 1

export default function Hero({ menuOpen, onOpenMenu }) {
  const { name, roles } = site
  const { reel } = useContent()
  // The showreel autoplays even with Reduce Motion on; the pause button is right there.
  const [reelRef, playback] = useVideoPlayback('reel', reel.src, { alwaysAutoplay: true })

  // The wordmark's ink is pinned to the outer ink edges of the roles row.
  const firstRole = useRef(null)
  const lastRole = useRef(null)
  const hero = useRef(null)
  const bar = useRef(null)
  const playIntro = useRef(null)
  const wordmark = useFitText(name, { alignStart: firstRole, alignEnd: lastRole, onFitted: playIntro })

  // Intro: the showreel plays on its own first; after INTRO_DELAY the
  // wordmark's letters come into focus from the centre outwards (from
  // blurred, transparent and lower), then the roles and the top bar follow.
  // The clock starts once the wordmark has its font and size.
  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, (context) => {
        const roles = firstRole.current.parentElement.children
        gsap.set([...roles, bar.current], { autoAlpha: 0 })

        // Named, so add() hands back the wrapped function instead of running it now.
        const start = context.add('playIntro', () => {
          const split = splitKeepingKerning(wordmark.current)
          gsap
            .timeline({ delay: INTRO_DELAY, defaults: { ease: EASE }, onComplete: () => split.revert() })
            .from(split.chars, {
              yPercent: 15,
              autoAlpha: 0,
              filter: 'blur(12px)',
              duration: 2,
              stagger: { each: 0.03, from: 'center' },
            })
            .to(roles, { autoAlpha: 1, duration: 1, stagger: 0.03 }, 0.5)
            .from(roles, { y: 16, duration: 1, stagger: 0.03 }, 0.5)
            .to(bar.current, { autoAlpha: 1, duration: 1 }, 0.7)
        })

        if (wordmark.current.hasAttribute('data-fitted')) start()
        else playIntro.current = start
        return () => {
          playIntro.current = null
        }
      })
    },
    { scope: hero },
  )

  return (
    <header id="top" className={styles.hero} ref={hero}>
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

      <div className={styles.bar} ref={bar}>
        <div className={styles.reelControls}>
          {/* The dot blinks while the showreel plays. */}
          <RecDot still={Boolean(reel.src) && !playback.playing} />
          {reel.src && <VideoControls playback={playback} label="showreel" />}
        </div>
        <MenuButton expanded={menuOpen} onClick={onOpenMenu} />
      </div>

      <div className={styles.bottom}>
        <ul className={`mono-ui ${styles.roles}`} aria-label="Roles">
          {roles.map((role, i) => (
            <li
              key={role}
              ref={i === 0 ? firstRole : i === roles.length - 1 ? lastRole : undefined}
            >
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
