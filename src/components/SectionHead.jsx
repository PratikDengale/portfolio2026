import styles from './SectionHead.module.css'

export default function SectionHead({ id, children }) {
  return (
    <div className={styles.head}>
      <h2 id={id} className={`mono-label ${styles.label}`}>
        {children}
      </h2>
    </div>
  )
}
