import { PauseIcon, PlayIcon, SoundOffIcon, SoundOnIcon } from './Icons'
import styles from './VideoControls.module.css'

// Play/pause and sound buttons for one video. `label` names the video for
// screen readers, e.g. "Pause fashion film".
export default function VideoControls({ playback, label, className = '' }) {
  const { playing, hasSound, togglePlay, toggleSound } = playback
  return (
    <div className={`${styles.controls} ${className}`}>
      <button
        type="button"
        className={styles.button}
        aria-label={`${playing ? 'Pause' : 'Play'} ${label}`}
        onClick={togglePlay}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button
        type="button"
        className={styles.button}
        aria-label={`${hasSound ? 'Mute' : 'Unmute'} ${label}`}
        onClick={toggleSound}
      >
        {hasSound ? <SoundOnIcon /> : <SoundOffIcon />}
      </button>
    </div>
  )
}
