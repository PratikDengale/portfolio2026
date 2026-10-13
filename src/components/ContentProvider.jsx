import { useEffect, useMemo, useState } from 'react'
import { resolveContent } from '../data/content'
import { ContentContext } from '../hooks/useContent'

// Loads the published media from the CMS. Until it arrives (or if it can't be
// reached) the page shows its placeholder tiles.
export default function ContentProvider({ children }) {
  const [manifest, setManifest] = useState(null)

  useEffect(() => {
    let active = true
    fetch('/api/content')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => active && data && setManifest(data))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const content = useMemo(() => resolveContent(manifest), [manifest])
  return <ContentContext value={content}>{children}</ContentContext>
}
