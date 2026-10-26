import styles from './Frost.module.css'

// A frosted strip across the top of the window that stays put while the page
// scrolls: whatever passes under it is blurred. Purely visual; clicks go
// straight through to what's underneath.
//
// The blur is progressive: strongest at the top edge, easing to nothing at
// the bottom. Each layer doubles the blur of the one before it and is masked
// to its own overlapping band of the strip, so the steps blend into a ramp.
const LAYERS = 6

export default function Frost() {
  return (
    <div className={styles.frost} aria-hidden="true">
      {Array.from({ length: LAYERS }, (_, i) => (
        <div key={i} className={styles.layer} />
      ))}
    </div>
  )
}
