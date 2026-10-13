import { useState } from 'react'
import { IMAGE_TYPES, LOGO_TYPES, MAX_UPLOAD_BYTES, VIDEO_TYPES } from '../../shared/mediaRules'
import styles from './SlotCard.module.css'

const fileSize = (bytes) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`

// Temporary URLs for previewing files that haven't been uploaded yet, one per
// file for as long as the file is staged anywhere.
const previews = new WeakMap()
function previewUrl(file) {
  if (!previews.has(file)) previews.set(file, URL.createObjectURL(file))
  return previews.get(file)
}

// What a field will be once published: the staged file, nothing, or the saved URL.
function fieldValue(saved, staged) {
  if (staged === undefined) return saved ?? null
  return staged ? previewUrl(staged) : null
}

function FileField({ label, types, value, staged, disabled, onChange }) {
  const [error, setError] = useState(null)

  const choose = (event) => {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    if (!types.includes(file.type)) {
      const allowed = types.map((type) => type.split('/')[1].replace('+xml', '').toUpperCase())
      return setError(`Use ${allowed.join(', ')}.`)
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return setError(`Too large (${fileSize(file.size)}). The limit is ${fileSize(MAX_UPLOAD_BYTES)}.`)
    }
    setError(null)
    onChange(file)
  }

  const state =
    staged instanceof File
      ? `${staged.name} · ${fileSize(staged.size)}`
      : staged === null
        ? 'Will be removed'
        : value
          ? 'Published'
          : 'Empty'

  return (
    <div className={styles.field}>
      <div className={styles.fieldText}>
        <span className={`mono-label ${styles.fieldLabel}`}>{label}</span>
        <span className={styles.fieldState}>{state}</span>
        {error && (
          <span className={styles.fieldError} role="alert">
            {error}
          </span>
        )}
      </div>
      <label className={`mono-ui ${styles.action}`} aria-disabled={disabled}>
        <input
          className="visually-hidden"
          type="file"
          accept={types.join(',')}
          disabled={disabled}
          aria-label={`${value ? 'Replace' : 'Choose'} ${label.toLowerCase()}`}
          onChange={choose}
        />
        {value ? 'Replace' : 'Choose'}
      </label>
      {value && (
        <button
          className={`mono-ui ${styles.action}`}
          type="button"
          disabled={disabled}
          aria-label={`Remove ${label.toLowerCase()}`}
          onClick={() => onChange(null)}
        >
          Remove
        </button>
      )}
    </div>
  )
}

export default function SlotCard({ slot, saved, changes, disabled, onStage, onRevert }) {
  const video = fieldValue(saved?.video, changes?.video)
  const image = fieldValue(saved?.image, changes?.image)
  const isLogo = slot.accepts === 'logo'
  const name = changes?.name ?? saved?.name ?? ''
  const caption = changes?.caption ?? saved?.caption ?? ''

  return (
    <article className={styles.card} data-pending={changes ? '' : undefined} aria-label={slot.label}>
      <div className={isLogo ? styles.logoPreview : styles.preview}>
        {video ? (
          // The key remounts the player when the file changes.
          <video key={video} src={video} poster={image ?? undefined} muted loop playsInline controls preload="metadata" />
        ) : image ? (
          <img src={image} alt="" />
        ) : (
          <span className={`mono-label ${styles.empty}`}>Empty</span>
        )}
      </div>

      <div className={styles.head}>
        <h3 className={styles.label}>{slot.label}</h3>
        {slot.ratio && <span className={`mono-label ${styles.ratio}`}>{slot.ratio.replace('/', ':')}</span>}
        {changes && (
          <button className={`mono-label ${styles.undo}`} type="button" disabled={disabled} onClick={onRevert}>
            Undo
          </button>
        )}
      </div>

      {slot.accepts === 'video' && (
        <FileField
          label="Video"
          types={VIDEO_TYPES}
          value={video}
          staged={changes?.video}
          disabled={disabled}
          onChange={(file) => onStage('video', file)}
        />
      )}
      <FileField
        label={slot.accepts === 'video' ? 'Poster / still' : isLogo ? 'Logo' : 'Image'}
        types={isLogo ? LOGO_TYPES : IMAGE_TYPES}
        value={image}
        staged={changes?.image}
        disabled={disabled}
        onChange={(file) => onStage('image', file)}
      />
      {slot.caption !== undefined && (
        <label className={styles.textField}>
          <span className={`mono-label ${styles.fieldLabel}`}>Caption</span>
          <input
            className={styles.name}
            type="text"
            value={caption}
            maxLength={80}
            placeholder={slot.caption}
            disabled={disabled}
            onChange={(event) => onStage('caption', event.target.value)}
          />
        </label>
      )}
      {isLogo && (
        <input
          className={styles.name}
          type="text"
          value={name}
          maxLength={80}
          placeholder={slot.label}
          aria-label={`Client name for ${slot.label}`}
          disabled={disabled}
          onChange={(event) => onStage('name', event.target.value)}
        />
      )}
    </article>
  )
}
