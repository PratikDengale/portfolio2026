import { useEffect, useRef, useState } from 'react'
import SectionHead from '../components/SectionHead'
import { site, slots } from '../data/content'
import {
  loadContent,
  saveContent,
  uploadBunnyVideo,
  uploadImage,
  uploadLocalVideo,
  waitForVideo,
} from './api'
import { fileSize } from './fileSize'
import SlotCard from './SlotCard'
import styles from './Admin.module.css'

// Content-document fields that belong to each kind of file, removed together.
const FIELDS = {
  video: ['video', 'videoId', 'thumbnail', 'videoSize'],
  image: ['image', 'imageSize'],
}

// Slots the site still has. Publishing drops anything saved for any other
// (such as the client logos, now fixed files), which frees its storage.
const slotIds = new Set(slots.map(({ id }) => id))

const groups = slots.reduce((byGroup, slot) => {
  ;(byGroup[slot.group] ??= []).push(slot)
  return byGroup
}, {})

// The media manager. Changes are staged in `draft` (per slot and field: a File
// to upload, null to remove, or a string for a caption) and nothing reaches the
// live site until Publish.
export default function Admin() {
  const [store, setStore] = useState(null) // { media, etag, storage } as last saved
  const [draft, setDraft] = useState({})
  const [progress, setProgress] = useState(null) // message while publishing
  const [notice, setNotice] = useState(null) // { kind: 'error' | 'ok', text }
  // File → what is known about its upload (Bunny id, then URL and size), so a
  // retried Publish carries on instead of uploading again.
  const uploaded = useRef(new WeakMap())

  useEffect(() => {
    loadContent()
      .then(({ content, etag, storage }) => setStore({ media: content.media ?? {}, etag, storage }))
      .catch((error) => setNotice({ kind: 'error', text: error.message }))
  }, [])

  const publishedBytes = Object.values(store?.media ?? {}).reduce(
    (total, entry) => total + (entry.videoSize ?? 0) + (entry.imageSize ?? 0),
    0,
  )
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
    const bunny = store.storage === 'bunny'
    try {
      for (const [i, { slot, field, file }] of files.entries()) {
        if (uploaded.current.has(file)) continue
        const label = `Uploading ${i + 1} of ${files.length}: ${file.name}`
        setProgress(label)
        if (field === 'image') uploaded.current.set(file, await uploadImage(slot, file))
        else if (!bunny) uploaded.current.set(file, await uploadLocalVideo(slot, file))
        else {
          const videoId = await uploadBunnyVideo(slot, file, (percent) => setProgress(`${label} (${percent}%)`))
          uploaded.current.set(file, { videoId })
        }
      }

      // Bunny encodes each new video before it can be published.
      for (const { file } of files) {
        const done = uploaded.current.get(file)
        if (done.video || !done.videoId) continue
        const ready = await waitForVideo(done.videoId, (percent, detail) =>
          setProgress(
            `Bunny is encoding ${file.name} (${percent}%)${detail ? `, waiting for its MP4: ${detail}` : ''}. Keep this page open.`,
          ),
        )
        uploaded.current.set(file, ready)
      }

      setProgress('Publishing…')
      const media = structuredClone(
        Object.fromEntries(Object.entries(store.media).filter(([slot]) => slotIds.has(slot))),
      )
      for (const [slot, changes] of Object.entries(draft)) {
        const entry = { ...media[slot] }
        for (const [field, value] of Object.entries(changes)) {
          if (value instanceof File) {
            for (const key of FIELDS[field]) delete entry[key]
            Object.assign(entry, uploaded.current.get(value))
          } else if (value) {
            entry[field] = value
          } else {
            for (const key of FIELDS[field] ?? [field]) delete entry[key]
          }
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
            Choose files for any slot, then Publish to put them on the site. Videos: MP4, MOV or
            WebM up to 2 GB. bunny.net re-encodes them to 720p for the site, so upload a
            good-quality export with sound if the clip has any; encoding takes a few minutes, so
            keep this page open until Publish finishes. Images: JPG, PNG, WebP or AVIF up to 4 MB.
            Without a poster, a video shows a frame Bunny picks.
          </p>
          <p className={styles.intro}>
            A caption is the small text at the bottom-left of a tile. An empty slot shows its
            caption (or the greyed default) over the placeholder. Once a slot has media, text
            appears over it only if you type a caption; leave it empty for a clean image.
          </p>
          {publishedBytes > 0 && (
            <p className={styles.intro}>
              Published media: <strong className={styles.weight}>{fileSize(publishedBytes)}</strong>. A visitor
              who scrolls the whole page downloads about this much, and bunny.net bills per GB
              delivered.
            </p>
          )}
          {store.storage === 'local' && (
            <p className={styles.intro}>
              Local mode: files are saved on this computer in <code>.cms/</code>, not on the live
              site.
            </p>
          )}
          {Object.entries(groups).map(([group, groupSlots]) => (
            <section key={group} className={styles.group} aria-labelledby={`group-${groupSlots[0].id}`}>
              <SectionHead id={`group-${groupSlots[0].id}`}>{group}</SectionHead>
              <div className={styles.grid}>
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
            Build {import.meta.env.VITE_BUILD} · Storage {store.storage}
          </p>
        </main>
      )}
    </div>
  )
}
