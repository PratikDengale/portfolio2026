import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { site } from '../data/content'
import { useIntroDone } from '../hooks/useIntro'
import { useMediaQuery, usePrefersReducedMotion } from '../hooks/useMediaQuery'
import { ScrollTrigger } from '../hooks/useReveal'
import { InstagramIcon, WhatsAppIcon } from './Icons'
import RecDot from './RecDot'
import styles from './Footer.module.css'

// The ID card brings three.js, so it loads on its own after the page.
const IdCard = lazy(() => import('./IdCard'))

const year = new Date().getFullYear()

export default function Footer() {
  const footer = useRef(null)
  // On phones the card would hang over the email; there's no room for it.
  const phone = useMediaQuery('(max-width: 640px)')
  // Larger on desktop. Up to tablet widths the email runs close to the card,
  // so it keeps its smaller size there.
  const desktop = useMediaQuery('(min-width: 1025px)')
  // The card enters (drops in on its strap) once the About section's bottom
  // edge, which is the footer's top, has scrolled up to the middle of the
  // screen, with the footer showing below it; until then it waits unseen.
  // Clamped for screens too tall for it to get that far: there it enters at
  // the bottom of the page. With Reduce Motion on there is no drop, so it is
  // simply there.
  const reducedMotion = usePrefersReducedMotion()
  const [cardEntered, setCardEntered] = useState(false)
  useEffect(() => {
    const trigger = ScrollTrigger.create({
      trigger: footer.current,
      start: 'clamp(top 50%)',
      once: true,
      onEnter: () => setCardEntered(true),
    })
    return () => trigger.kill()
  }, [])
  // Setting the card up (three.js, its shaders, the drawn faces) holds the
  // page up for a fifth of a second, which would make the hero's preloader
  // stutter mid-move. So it waits for the intro to finish (with Reduce Motion
  // there is none) and then for a quiet moment; it is long ready before the
  // footer is reached.
  const introDone = useIntroDone() || reducedMotion
  const [cardWanted, setCardWanted] = useState(false)
  useEffect(() => {
    if (!introDone || cardWanted) return
    const whenIdle = window.requestIdleCallback ?? ((load) => setTimeout(load, 200))
    const cancel = window.cancelIdleCallback ?? clearTimeout
    const id = whenIdle(() => setCardWanted(true), { timeout: 2000 })
    return () => cancel(id)
  }, [introDone, cardWanted])
  return (
    // The content is fixed in place (see Footer.module.css), so its reveals are
    // timed by the footer's own box as it scrolls up.
    <footer id="contact" className={styles.footer} aria-labelledby="contact-title" data-reveal-scope ref={footer}>
      <div className={styles.inner}>
        {/* Hangs from the footer's top edge, in the right half (at 78%, which
            keeps it clear of the email down to tablet widths), over the
            content; only the card itself catches the pointer. It is seen
            through the footer's box, so that is what it watches. */}
        {!phone && cardWanted && (
          <div className={styles.idCard}>
            <Suspense fallback={null}>
              <IdCard
                watch={footer}
                anchor={0.78}
                size={desktop ? 0.52 : 0.42}
                strapLength={0.57}
                hold={!cardEntered && !reducedMotion}
              />
            </Suspense>
          </div>
        )}

        {/* No visible heading; screen readers still get one. */}
        <h2 id="contact-title" className="visually-hidden">
          Contact
        </h2>

        <div className={styles.row} data-reveal="fade">
          <p className={`mono-ui ${styles.status}`}>
            <RecDot />
            {site.status}
          </p>
        </div>

        <ul className={styles.actions} data-reveal="stagger">
          <li>
            <a
              className={styles.action}
              href={site.socials.instagram}
              aria-label={`Instagram, ${site.socials.instagramHandle}`}
              target="_blank"
              rel="noopener"
            >
              <InstagramIcon />
              {site.socials.instagramHandle}
            </a>
          </li>
          <li>
            <a
              className={styles.action}
              href={site.socials.whatsapp}
              aria-label="DM me on WhatsApp"
              target="_blank"
              rel="noopener"
            >
              <WhatsAppIcon />
              DM me
            </a>
          </li>
          <li>
            <a className={styles.action} href={`mailto:${site.email}`}>
              {site.email}
            </a>
          </li>
        </ul>

        <div className={`${styles.row} ${styles.base}`} data-reveal="fade">
          <p className={`mono-label ${styles.label}`}>
            © {year} {site.name}
          </p>
          <a className={`mono-label ${styles.label} ${styles.top}`} href="#top">
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  )
}
