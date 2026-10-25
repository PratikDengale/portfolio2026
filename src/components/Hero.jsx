import { useRef } from 'react'
import { site } from '../data/content'
import { useContent } from '../hooks/useContent'
import { useFitText } from '../hooks/useFitText'
import { EASE, gsap, MOTION_OK, useGSAP } from '../hooks/useReveal'
import { useVideoPlayback } from '../hooks/useVideoPlayback'
import MenuButton from './MenuButton'
import RecDot from './RecDot'
import VideoControls from './VideoControls'
import styles from './Hero.module.css'

export default function Hero({ menuOpen, onOpenMenu }) {
  const { name, roles } = site
  const { reel } = useContent()
  const [reelRef, playback] = useVideoPlayback('reel', reel.src)

  // The wordmark's ink is pinned to the outer ink edges of the roles row.
  const firstRole = useRef(null)
  const lastRole = useRef(null)
  const hero = useRef(null)
  const bar = useRef(null)
  const playIntro = useRef(null)
  const wordmark = useFitText(name, { alignStart: firstRole, alignEnd: lastRole, onFitted: playIntro })

  // Intro: the wordmark rises out of its mask, then the roles and the top bar
  // follow. It starts once the wordmark has its font and size.
  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        const intro = gsap
          .timeline({ paused: true, defaults: { ease: EASE } })
          .from(wordmark.current, { yPercent: 105, duration: 1.4 })
          .from(firstRole.current.parentElement.children, { y: 16, autoAlpha: 0, duration: 1, stagger: 0.08 }, 0.3)
          .from(bar.current, { autoAlpha: 0, duration: 1 }, 0.5)
        if (wordmark.current.hasAttribute('data-fitted')) intro.play()
        else playIntro.current = () => intro.play()
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
