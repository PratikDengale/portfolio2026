import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { usePrefersReducedMotion } from './useMediaQuery'

// Which video on the page currently has its sound on. Only one at a time:
// turning sound on for one video mutes the rest.
let soundOwner = null
const listeners = new Set()
function setSoundOwner(id) {
  soundOwner = id
  listeners.forEach((notify) => notify())
}
const subscribe = (notify) => {
  listeners.add(notify)
  return () => listeners.delete(notify)
}
const useSoundOwner = () => useSyncExternalStore(subscribe, () => soundOwner)

// Playback for one background video with play/pause and sound controls.
//
// - It plays (muted) while at least 40% of it is on screen. If the visitor
//   prefers reduced motion it waits for the play button instead, unless
//   `alwaysAutoplay` is set (the showreel, which has a visible pause button).
// - If the device blocks autoplay (e.g. iPhone Low Power Mode), it starts on
//   the visitor's first tap anywhere, which browsers accept as permission.
// - Pausing sticks: a paused video stays paused when scrolled back to.
// - Sound needs a click (browsers only autoplay muted), and leaving the
//   screen pauses it, so nothing is heard that can't be seen.
//
// `id` identifies the video for the one-sound-at-a-time rule; `src` restarts
// the wiring when the file changes. Returns [ref for the <video>, state and
// toggles for its controls].
export function useVideoPlayback(id, src, { alwaysAutoplay = false } = {}) {
  const ref = useRef(null)
  const reducedMotion = usePrefersReducedMotion() && !alwaysAutoplay
  const hasSound = useSoundOwner() === id
  const [choice, setChoice] = useState(null) // the visitor's play/pause, once pressed
  const [visible, setVisible] = useState(false)
  const [playing, setPlaying] = useState(false)
  const shouldPlay = visible && (choice ?? !reducedMotion)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    // React sets only the muted *property*; Safari also wants the attribute
    // before it will autoplay.
    video.defaultMuted = true
    video.muted = true
    const update = () => setPlaying(!video.paused)
    video.addEventListener('play', update)
    video.addEventListener('pause', update)
    const io = new IntersectionObserver(([entry]) => setVisible(entry.intersectionRatio >= 0.4), {
      threshold: [0, 0.4],
    })
    io.observe(video)
    return () => {
      io.disconnect()
      video.removeEventListener('play', update)
      video.removeEventListener('pause', update)
      video.pause()
    }
  }, [src])

  useEffect(() => {
    if (ref.current) ref.current.muted = !hasSound
  }, [hasSound, src])

  useEffect(() => {
    const video = ref.current
    if (!video) return
    if (!shouldPlay) {
      video.pause()
      return
    }
    let retry = null
    video.play().catch(() => {
      setPlaying(false)
      // Autoplay refused by the device: try again on the first tap or key.
      retry = () => {
        removeRetry()
        video.play().catch(() => {})
      }
      for (const type of ['touchend', 'click', 'keydown']) document.addEventListener(type, retry, true)
    })
    const removeRetry = () => {
      if (!retry) return
      for (const type of ['touchend', 'click', 'keydown']) document.removeEventListener(type, retry, true)
      retry = null
    }
    return removeRetry
  }, [shouldPlay, src])

  // Give up the sound when this video goes away.
  useEffect(() => () => soundOwner === id && setSoundOwner(null), [id])

  // Both toggles act on the element directly as well: browsers only allow
  // starting playback with sound inside the click itself.
  const togglePlay = () => {
    const video = ref.current
    if (!video) return
    if (video.paused) {
      setChoice(true)
      video.play().catch(() => {})
    } else {
      setChoice(false)
      video.pause()
    }
  }

  const toggleSound = () => {
    const video = ref.current
    if (!video) return
    if (hasSound) {
      video.muted = true
      setSoundOwner(null)
    } else {
      video.muted = false
      setSoundOwner(id)
      setChoice(true)
      video.play().catch(() => {})
    }
  }

  // Controls stay in view whenever the video isn't simply playing muted.
  const engaged = choice === false || hasSound || (reducedMotion && choice === null)

  return [ref, { playing, hasSound, engaged, togglePlay, toggleSound }]
}
