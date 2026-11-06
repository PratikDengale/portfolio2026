import { useContent } from '../hooks/useContent'
import { useMediaQuery } from '../hooks/useMediaQuery'
import Media from './Media'
import styles from './SelectedWork.module.css'

// A tile's height per unit of column width: 16/9 → 0.5625.
const heightOf = ({ ratio }) => {
  const [width, height] = ratio.split('/').map(Number)
  return height / width
}

// Lays the authored blocks out in `count` columns. At the authored count each
// column runs on through every block, and one column keeps the authored order.
// Anything else takes the tiles in reading order (block by block, row by row)
// and puts each in the shortest column so far, so the columns end close to
// level and later blocks stay at the bottom.
function arrange(blocks, count) {
  if (count === 1) return [blocks.flat(2)]
  if (count === blocks[0].length) return blocks[0].map((_, c) => blocks.flatMap((block) => block[c]))
  const columns = Array.from({ length: count }, () => ({ items: [], height: 0 }))
  for (const block of blocks) {
    const rows = Math.max(...block.map((column) => column.length))
    for (let row = 0; row < rows; row++) {
      for (const item of block.map((column) => column[row]).filter(Boolean)) {
        const shortest = columns.reduce((a, b) => (b.height < a.height ? b : a))
        shortest.items.push(item)
        shortest.height += heightOf(item)
      }
    }
  }
  return columns.map(({ items }) => items)
}

export default function SelectedWork() {
  const { work } = useContent()
  // Breakpoints match SelectedWork.module.css.
  const single = useMediaQuery('(max-width: 640px)')
  const double = useMediaQuery('(max-width: 1024px)')
  const columns = arrange(work, single ? 1 : double ? 2 : 3)

  return (
    <section id="work" className={styles.section} aria-label="Selected work">
      <div className={styles.grid}>
        {columns.map((column, i) => (
          <div key={i} className={styles.column}>
            {column.map(({ slot, ...item }) => (
              <div key={slot} data-reveal="media">
                <Media id={slot} {...item} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
