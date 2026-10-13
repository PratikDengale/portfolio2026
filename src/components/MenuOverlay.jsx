import { useEffect, useRef } from 'react'
import { site } from '../data/content'
import { InstagramIcon, WhatsAppIcon } from './Icons'
import MenuButton from './MenuButton'
import RecDot from './RecDot'
import styles from './MenuOverlay.module.css'

const links = [
  { href: '#work', label: 'Work' },
  { href: '#services', label: 'Services' },
  { href: '#about', label: 'About' },
  { href: '#contact', label: 'Contact' },
]

// Full-screen menu. A modal <dialog> gives us the focus trap, Esc to close and
// focus return to the opener for free.
export default function MenuOverlay({ open, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  const close = () => ref.current.close()

  return (
    <dialog ref={ref} className={styles.overlay} aria-label="Menu" onClose={onClose}>
      <div className={styles.bar}>
        <RecDot />
        <MenuButton close onClick={close} />
      </div>

      <nav className={styles.links} aria-label="Primary">
        {links.map(({ href, label }) => (
          <a key={href} className={styles.link} href={href} onClick={close}>
            {label}
          </a>
        ))}
      </nav>

      <div className={`mono-ui ${styles.foot}`}>
        <a href={`mailto:${site.email}`}>{site.email}</a>
        <div className={styles.icons}>
          <a href={site.socials.instagram} aria-label="Instagram" target="_blank" rel="noopener">
            <InstagramIcon size={20} />
          </a>
          <a href={site.socials.whatsapp} aria-label="WhatsApp" target="_blank" rel="noopener">
            <WhatsAppIcon size={20} />
          </a>
        </div>
      </div>
    </dialog>
  )
}
