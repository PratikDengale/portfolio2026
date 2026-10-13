import { about, site } from '../data/content'
import { useContent } from '../hooks/useContent'
import Media from './Media'
import styles from './About.module.css'

export default function About() {
  const { portrait } = useContent()
  return (
    <section id="about" className={styles.section} aria-labelledby="about-title">
      <h2 id="about-title" className="visually-hidden">
        About
      </h2>
      <div className={styles.portrait}>
        <Media ratio="4/5" src={portrait} label="portrait" alt={`Portrait of ${site.name}`} />
      </div>
      <div className={styles.text}>
        <p className={styles.body}>{about.body}</p>
        <dl className={styles.meta}>
          {about.meta.map(({ k, v }) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
