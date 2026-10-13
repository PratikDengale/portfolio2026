import { useRef } from 'react'
import { site } from '../data/content'
import { useFitText } from '../hooks/useFitText'
import { usePrefersReducedMotion } from '../hooks/useMediaQuery'
import MenuButton from './MenuButton'
import RecDot from './RecDot'
import styles from './Hero.module.css'

export default function Hero({ menuOpen, onOpenMenu }) {
  const { name, roles, reel } = site
  const reducedMotion = usePrefersReducedMotion()

  // The wordmark's ink is pinned to the outer ink edges of the roles row.
  const firstRole = useRef(null)
  const lastRole = useRef(null)
  const wordmark = useFitText(name, { alignStart: firstRole, alignEnd: lastRole })

  return (
    <header id="top" className={styles.hero}>
      {reel.src || reel.webm ? (
        <video
          className={styles.reel}
          autoPlay={!reducedMotion}
          muted
          loop
          playsInline
          preload="metadata"
          poster={reel.poster ?? undefined}
          aria-hidden="true"
        >
          {reel.webm && <source src={reel.webm} type="video/webm" />}
          {reel.src && <source src={reel.src} type="video/mp4" />}
        </video>
      ) : (
        reel.poster && <img className={styles.reel} src={reel.poster} alt="" />
      )}

      <div className={styles.bar}>
        <RecDot />
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
