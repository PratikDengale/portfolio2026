import { site } from '../data/content'
import { InstagramIcon, WhatsAppIcon } from './Icons'
import RecDot from './RecDot'
import styles from './Footer.module.css'

const year = new Date().getFullYear()

export default function Footer() {
  return (
    <footer id="contact" className={styles.footer} aria-labelledby="contact-title">
      <div className={styles.inner}>
        <div className={styles.row} data-reveal="fade">
          <h2 id="contact-title" className={`mono-label ${styles.label}`}>
            Contact
          </h2>
          <p className={`mono-ui ${styles.status}`}>
            <RecDot />
            {site.status}
          </p>
        </div>

        <div className={styles.middle}>
          <a className={styles.email} href={`mailto:${site.email}`} data-reveal="lines">
            {site.email}
          </a>
          <div className={styles.icons} data-reveal="stagger">
            <a
              className={styles.social}
              href={site.socials.instagram}
              aria-label={`Instagram, ${site.socials.instagramHandle}`}
              target="_blank"
              rel="noopener"
            >
              <InstagramIcon />
              <span className={styles.handle}>{site.socials.instagramHandle}</span>
            </a>
            <a href={site.socials.whatsapp} aria-label="WhatsApp" target="_blank" rel="noopener">
              <WhatsAppIcon />
            </a>
          </div>
        </div>

        <div className={styles.row} data-reveal="fade">
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
