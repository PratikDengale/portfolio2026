import { clients, services } from '../data/content'
import Media from './Media'
import SectionHead from './SectionHead'
import styles from './Services.module.css'

export default function Services() {
  return (
    <section id="services" className={styles.section} aria-labelledby="services-title">
      <SectionHead id="services-title">Services</SectionHead>

      <ul className={styles.cards}>
        {services.map(({ title, media, ...source }) => (
          <li key={title} className={styles.card}>
            <Media ratio="4/3" label={media} alt={title} {...source} />
            <h3 className={styles.title}>{title}</h3>
          </li>
        ))}
      </ul>

      <ul className={styles.logos} aria-label="Clients">
        {clients.map(({ name, logo }) => (
          <li key={name} className={`mono-label ${styles.logo}`}>
            {logo ? <img src={logo} alt={name} loading="lazy" /> : <span>{name}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
