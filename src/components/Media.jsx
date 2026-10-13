import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../hooks/useMediaQuery'
import styles from './Media.module.css'

const VIDEO = /\.(mp4|webm|mov|m4v)$/i

// A fixed-ratio media tile. Renders a looping video when `src` is a video, an
// image when there is only a still, and a labelled placeholder when neither
// exists yet.
export default function Media({ ratio, src, webm, poster, alt, label }) {
  const videoRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()
  const isVideo = VIDEO.test(src ?? '') || Boolean(webm)
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
          muted
          loop
          playsInline
          preload="none"
          poster={poster ?? undefined}
          controls={reducedMotion}
          aria-label={alt}
        >
          {webm && <source src={webm} type="video/webm" />}
          {src && <source src={src} type="video/mp4" />}
        </video>
      </div>
    )
  }

  if (image) {
    return (
      <div className={styles.tile} style={{ aspectRatio: ratio }}>
        <img className={styles.fill} src={image} alt={alt ?? ''} loading="lazy" decoding="async" />
      </div>
    )
  }

  return (
    <div
      className={`${styles.tile} ${styles.placeholder}`}
      style={{ aspectRatio: ratio }}
      role="img"
      aria-label={alt ?? label}
      data-label={label}
    />
  )
}
