export function InstagramIcon({ size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

// The WhatsApp glyph fills its whole 24-unit box while the Instagram outline
// sits inside its box, so the viewBox is padded to shrink the glyph to the
// same optical size (a touch larger, as a round shape reads smaller).
export function WhatsAppIcon({ size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-1.7 -1.7 27.4 27.4"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

// Video controls: drawn on a 20-unit grid with the same thin strokes as the
// menu button, filled where a shape reads better solid.
const controlIcon = (children) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    {children}
  </svg>
)

export const PlayIcon = () => controlIcon(<path d="M6 4.2v11.6L15.6 10z" fill="currentColor" stroke="none" />)

export const PauseIcon = () =>
  controlIcon(
    <>
      <rect x="5.5" y="4.5" width="2.6" height="11" fill="currentColor" stroke="none" />
      <rect x="11.9" y="4.5" width="2.6" height="11" fill="currentColor" stroke="none" />
    </>,
  )

const speaker = <path d="M3.5 7.6h2.8L10 4.6v10.8l-3.7-3H3.5z" fill="currentColor" stroke="none" />

export const SoundOnIcon = () =>
  controlIcon(
    <>
      {speaker}
      <path d="M12.6 7.4a3.6 3.6 0 0 1 0 5.2M14.8 5.3a6.6 6.6 0 0 1 0 9.4" strokeLinecap="round" />
    </>,
  )

export const SoundOffIcon = () =>
  controlIcon(
    <>
      {speaker}
      <path d="M12.8 7.8l4.4 4.4M17.2 7.8l-4.4 4.4" strokeLinecap="round" />
    </>,
  )
