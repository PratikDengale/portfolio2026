import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../hooks/useMediaQuery'
import styles from './Media.module.css'

const VIDEO = /\.(mp4|webm|mov|m4v)$/i

// A fixed-ratio media tile. Renders a looping video when `src` is a video, an
// image when there is only a still, and a labelled placeholder when neither
// exists yet. `caption` is optional text set in the CMS: it replaces the
// placeholder's label, and is the only text shown over real media.
export default function Media({ ratio, src, poster, alt, label, caption }) {
  const videoRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()
  const isVideo = VIDEO.test(src ?? '')
  const image = isVideo ? null : (src ?? poster)

  // Play only while at least 40% of the tile is on screen.
  useEffect(() => {
    const video = videoRef.current
    if (!video || reducedMotion) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.4) video.play().catch(() => {})
        else video.pause()
      },
      { threshold: 0.4 },
    )
    io.observe(video)
    return () => {
      io.disconnect()
      video.pause()
    }
  }, [isVideo, reducedMotion])

  if (isVideo) {
    return (
      <div className={styles.tile} style={{ aspectRatio: ratio }}>
        <video
          ref={videoRef}
          className={styles.fill}
          src={src}
          muted
          loop
          playsInline
          preload="none"
          poster={poster ?? undefined}
          controls={reducedMotion}
          aria-label={alt}
        />
        {caption && <p className={`mono-label ${styles.caption}`}>{caption}</p>}
      </div>
    )
  }

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
