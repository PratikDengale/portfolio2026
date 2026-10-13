import styles from './MenuButton.module.css'

// The 44px two-line button in the top bar. With `close` the lines cross into
// an "×" for the overlay; otherwise it is the menu opener.
export default function MenuButton({ close = false, expanded, onClick }) {
  return (
    <button
      type="button"
      className={`${styles.button} ${close ? styles.close : ''}`}
      aria-label={close ? 'Close menu' : 'Open menu'}
      aria-expanded={close ? undefined : expanded}
      aria-haspopup={close ? undefined : 'dialog'}
      onClick={onClick}
    >
      <span className={styles.line} />
      <span className={styles.line} />
    </button>
  )
}
