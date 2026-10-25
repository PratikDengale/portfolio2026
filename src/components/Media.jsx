import { useVideoPlayback } from '../hooks/useVideoPlayback'
import VideoControls from './VideoControls'
import styles from './Media.module.css'

const VIDEO = /\.(mp4|webm|mov|m4v)$/i

function VideoTile({ id, ratio, src, poster, alt, caption }) {
  const [videoRef, playback] = useVideoPlayback(id, src)
  return (
    <div
      className={`${styles.tile} ${styles.withControls}`}
      style={{ aspectRatio: ratio }}
      data-engaged={playback.engaged ? '' : undefined}
    >
      <video
        ref={videoRef}
        className={styles.fill}
        src={src}
        muted
        loop
        playsInline
        preload="none"
        poster={poster ?? undefined}
        aria-label={alt}
      />
      {caption && <p className={`mono-label ${styles.caption}`}>{caption}</p>}
      <VideoControls playback={playback} label={(alt ?? 'video').toLowerCase()} className={styles.controls} />
    </div>
  )
}

// A fixed-ratio media tile. Renders a looping video with play/pause and sound
// controls when `src` is a video, an image when there is only a still, and a
// labelled placeholder when neither exists yet. `caption` is optional text set
// in the CMS: it replaces the placeholder's label, and is the only text shown
// over real media. `id` (the CMS slot) tells videos apart.
export default function Media({ id, ratio, src, poster, alt, label, caption }) {
  if (VIDEO.test(src ?? '')) {
    return <VideoTile id={id} ratio={ratio} src={src} poster={poster} alt={alt} caption={caption} />
  }

  const image = src ?? poster
  if (image) {
    return (
      <div className={styles.tile} style={{ aspectRatio: ratio }}>
        <img className={styles.fill} src={image} alt={alt ?? ''} loading="lazy" decoding="async" />
        {caption && <p className={`mono-label ${styles.caption}`}>{caption}</p>}
      </div>
    )
  }

  return (
    <div
      className={`${styles.tile} ${styles.placeholder}`}
      style={{ aspectRatio: ratio }}
      role="img"
      aria-label={alt ?? label}
      data-label={caption ?? label}
    />
  )
}
