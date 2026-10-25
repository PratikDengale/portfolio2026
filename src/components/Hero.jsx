import { useRef } from 'react'
import { site } from '../data/content'
import { useContent } from '../hooks/useContent'
import { useFitText } from '../hooks/useFitText'
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
  const wordmark = useFitText(name, { alignStart: firstRole, alignEnd: lastRole })

  return (
    <header id="top" className={styles.hero}>
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

      <div className={styles.bar}>
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
