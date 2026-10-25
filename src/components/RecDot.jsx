import styles from './RecDot.module.css'

// The blinking "recording" dot. `still` stops the blink, e.g. while the
// showreel is paused.
export default function RecDot({ still = false }) {
  return <span className={`${styles.dot} ${still ? styles.still : ''}`} aria-hidden="true" />
}
