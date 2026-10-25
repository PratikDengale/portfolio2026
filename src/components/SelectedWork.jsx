import { useContent } from '../hooks/useContent'
import { useMediaQuery } from '../hooks/useMediaQuery'
import Media from './Media'
import SectionHead from './SectionHead'
import styles from './SelectedWork.module.css'

// Re-deals the authored columns for narrower layouts: one column keeps the
// authored order, anything else is dealt round-robin from row-major order.
function arrange(columns, count) {
  if (count === columns.length) return columns
  if (count === 1) return [columns.flat()]
  const rows = Math.max(...columns.map((column) => column.length))
  const rowMajor = Array.from({ length: rows }, (_, row) => columns.map((column) => column[row]))
    .flat()
    .filter(Boolean)
  return Array.from({ length: count }, (_, c) => rowMajor.filter((_, i) => i % count === c))
}

export default function SelectedWork() {
  const { work } = useContent()
  // Breakpoints match SelectedWork.module.css.
  const single = useMediaQuery('(max-width: 640px)')
  const double = useMediaQuery('(max-width: 1024px)')
  const columns = arrange(work, single ? 1 : double ? 2 : 3)

  return (
    <section id="work" className={styles.section} aria-labelledby="work-title">
      <SectionHead id="work-title">Selected work</SectionHead>
      <div className={styles.grid}>
        {columns.map((column, i) => (
          <div key={i} className={styles.column}>
            {column.map(({ slot, ...item }) => (
              <Media key={slot} id={slot} {...item} />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
