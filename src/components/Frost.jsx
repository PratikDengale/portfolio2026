import styles from './Frost.module.css'

// A frosted strip across the top of the window that stays put while the page
// scrolls: whatever passes under it is blurred. Purely visual; clicks go
// straight through to what's underneath.
export default function Frost() {
  return <div className={styles.frost} aria-hidden="true" />
}
