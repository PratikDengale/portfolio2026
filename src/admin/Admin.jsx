import { useEffect, useRef, useState } from 'react'
import SectionHead from '../components/SectionHead'
import { site, slots } from '../data/content'
import { loadContent, saveContent, uploadFile } from './api'
import SlotCard from './SlotCard'
import styles from './Admin.module.css'

const groups = slots.reduce((byGroup, slot) => {
  ;(byGroup[slot.group] ??= []).push(slot)
  return byGroup
}, {})

// The media manager. Changes are staged in `draft` (per slot and field: a File
// to upload, null to remove, or a string for a name or caption) and nothing reaches the
// live site until Publish.
export default function Admin() {
  const [store, setStore] = useState(null) // { media, etag, storage, upload } as last saved
  const [draft, setDraft] = useState({})
  const [progress, setProgress] = useState(null) // message while publishing
  const [notice, setNotice] = useState(null) // { kind: 'error' | 'ok', text }
  const uploaded = useRef(new WeakMap()) // File → URL, so a retry doesn't re-upload

  useEffect(() => {
    loadContent()
      .then(({ content, etag, storage, upload }) =>
        setStore({ media: content.media ?? {}, etag, storage, upload }),
      )
      .catch((error) => setNotice({ kind: 'error', text: error.message }))
  }, [])

  const changeCount = Object.values(draft).reduce((n, changes) => n + Object.keys(changes).length, 0)
  const publishing = progress !== null

  useEffect(() => {
    if (!changeCount) return
    const warn = (event) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [changeCount])

  const stage = (slot, field, value) => {
    setNotice(null)
    setDraft((current) => {
      const changes = { ...current[slot], [field]: value }
      // Putting a field back to what is already saved is not a change.
      const savedValue = store.media[slot]?.[field] ?? null
      if (!(value instanceof File) && (value || null) === savedValue) delete changes[field]
      const next = { ...current, [slot]: changes }
      if (!Object.keys(changes).length) delete next[slot]
      return next
    })
  }

  const revert = (slot) =>
    setDraft((current) => {
      const next = { ...current }
      delete next[slot]
      return next
    })

  async function publish() {
    setNotice(null)
    const files = Object.entries(draft).flatMap(([slot, changes]) =>
      Object.entries(changes)
        .filter(([, value]) => value instanceof File)
        .map(([field, file]) => ({ slot, field, file })),
    )
    try {
      for (const [i, { slot, file }] of files.entries()) {
        if (uploaded.current.has(file)) continue
        const label = `Uploading ${i + 1} of ${files.length}: ${file.name}`
        setProgress(label)
        const url = await uploadFile(store.upload, slot, file, (percent) =>
          setProgress(`${label} (${percent}%)`),
        )
        uploaded.current.set(file, url)
      }

      setProgress('Publishing…')
      const media = structuredClone(store.media)
      for (const [slot, changes] of Object.entries(draft)) {
        const entry = { ...media[slot] }
        for (const [field, value] of Object.entries(changes)) {
          if (value instanceof File) entry[field] = uploaded.current.get(value)
          else if (value) entry[field] = value
          else delete entry[field]
        }
        if (Object.keys(entry).length) media[slot] = entry
        else delete media[slot]
      }

      const { content, etag } = await saveContent({ media }, store.etag)
      setStore({ ...store, media: content.media, etag })
      setDraft({})
      setNotice({ kind: 'ok', text: 'Published. The live site picks it up within a minute or two.' })
    } catch (error) {
      setNotice({ kind: 'error', text: error.message })
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <h1 className={`mono-label ${styles.title}`}>{site.name} · Media</h1>
        <a className={`mono-ui ${styles.button}`} href="/" target="_blank" rel="noopener">
          View site ↗
        </a>
        <form method="post" action="/api/logout">
          <button className={`mono-ui ${styles.button}`} type="submit">
            Log out
          </button>
        </form>
        <button
          className={`mono-ui ${styles.button}`}
          type="button"
          disabled={!changeCount || publishing}
          onClick={() => setDraft({})}
        >
          Discard
        </button>
        <button
          className={`mono-ui ${styles.button} ${styles.primary}`}
          type="button"
          disabled={!changeCount || publishing}
          onClick={publish}
        >
          {changeCount ? `Publish ${changeCount} change${changeCount > 1 ? 's' : ''}` : 'Publish'}
        </button>
      </header>

      <div className={styles.status} aria-live="polite">
        {progress && <p className={styles.progress}>{progress}</p>}
        {notice && (
          <p className={notice.kind === 'error' ? styles.error : styles.ok} role={notice.kind === 'error' ? 'alert' : undefined}>
            {notice.text}
          </p>
        )}
      </div>

      {store && (
        <main>
          <p className={styles.intro}>
            Choose files for any slot, then Publish to put them on the site. Video: MP4 (H.264) or
            WebM. Images: JPG, PNG, WebP or AVIF; logos can also be SVG. Keep clips short and
            compressed, since visitors download them as the page loads.
          </p>
          <p className={styles.intro}>
            A caption is the small text at the bottom-left of a tile. An empty slot shows its
            caption (or the greyed default) over the placeholder. Once a slot has media, text
            appears over it only if you type a caption; leave it empty for a clean image.
          </p>
          {store.storage === 'local' && (
            <p className={styles.intro}>
              Local mode: files are saved on this computer in <code>.cms/</code>, not on the live
              site.
            </p>
          )}
          {Object.entries(groups).map(([group, groupSlots]) => (
            <section key={group} className={styles.group} aria-labelledby={`group-${groupSlots[0].id}`}>
              <SectionHead id={`group-${groupSlots[0].id}`}>{group}</SectionHead>
              <div className={groupSlots[0].accepts === 'logo' ? styles.logoGrid : styles.grid}>
                {groupSlots.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    saved={store.media[slot.id]}
                    changes={draft[slot.id]}
                    disabled={publishing}
                    onStage={(field, value) => stage(slot.id, field, value)}
                    onRevert={() => revert(slot.id)}
                  />
                ))}
              </div>
            </section>
          ))}
          <p className={`mono-label ${styles.build}`}>
            Build {import.meta.env.VITE_BUILD} · Storage {store.storage} · Upload {store.upload}
          </p>
        </main>
      )}
    </div>
  )
}
