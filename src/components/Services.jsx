import { clients } from '../data/content'
import { useContent } from '../hooks/useContent'
import Media from './Media'
import SectionHead from './SectionHead'
import styles from './Services.module.css'

export default function Services() {
  const { services } = useContent()
  return (
    <section id="services" className={styles.section} aria-labelledby="services-title">
      <SectionHead id="services-title">Services</SectionHead>

      <ul className={styles.cards}>
        {services.map(({ slot, title, label, src, poster, caption }) => (
          <li key={slot} className={styles.card}>
            <div data-reveal="media">
              <Media
                id={slot}
                ratio="4/3"
                label={label}
                alt={title}
                src={src}
                poster={poster}
                caption={caption}
              />
            </div>
            <h3 className={styles.title} data-reveal="fade">
              {title}
            </h3>
          </li>
        ))}
      </ul>

      <ul className={styles.logos} aria-label="Clients" data-reveal="stagger">
        {clients.map(({ name, logo, height }) => (
          <li key={name} className={`mono-label ${styles.logo}`}>
            {logo ? (
              <img src={logo} alt={name} loading="lazy" style={height && { '--logo-height': `${height}px` }} />
            ) : (
              <span>{name}</span>
            )}
          </li>
        ))}
      </ul>
      <p className={`mono-label ${styles.more}`} data-reveal="fade">
        and many more
      </p>
    </section>
  )
}
