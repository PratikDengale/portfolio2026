import { useEffect, useState } from 'react'
import { site } from '../data/content'
import Lanyard from './Lanyard'

// The hanging ID card. Its faces are drawn here from the site's copy, fonts
// and colours, so the card never goes stale; the strap is plain. A dark card,
// to stand out on the light footer it hangs in.

// A face in canvas pixels: the Lanyard's portrait card (1.6 × 2.25 units) at
// its 1024px face width. The strap slot is a pill around the top centre
// (about y 60–105), so nothing is drawn there.
const W = 1024
const H = 1440
const MARGIN = 88

// The dot grid above the name: rows of faint dots, one of them in the site's
// red (third row from the bottom, sixth column). The columns span the margins
// (106px apart); rows are spaced a little wider. In face pixels: the card
// shows at about 1/4.7 of this size on a desktop screen.
const COLUMNS = 8
const ROWS = 6
const GRID_TOP = 120
const DOT = 75
const ROW_PITCH = 115
const ACCENT = { fromBottom: 3, column: 5 }

function canvas(width, height) {
  const element = document.createElement('canvas')
  element.width = width
  element.height = height
  return [element, element.getContext('2d')]
}

// Sets a font, with tracking in em where the canvas supports it.
function setFont(ctx, font, size, tracking = 0) {
  ctx.font = `${font.weight} ${size}px ${font.family}`
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${tracking * size}px`
}

// The site's red as `r, g, b`, for drawing it at any opacity (the CSS value
// is oklch, which can't take an alpha by string concatenation).
function rgbOf(color) {
  const [, ctx] = canvas(1, 1)
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  return ctx.getImageData(0, 0, 1, 1).data.slice(0, 3).join(', ')
}

// A red glow rising from below the card: an ellipse centred a third of the
// card's height under its bottom edge, so only its upper part shows, fading
// gradually up the card.
function drawGlow(ctx, rec) {
  const rgb = rgbOf(rec)
  const across = W * 1.47
  const up = 1400
  ctx.save()
  ctx.translate(W / 2, H + H / 3)
  ctx.scale(1, up / across)
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, across)
  glow.addColorStop(0, `rgba(${rgb}, 0.5)`)
  glow.addColorStop(0.35, `rgba(${rgb}, 0.26)`)
  glow.addColorStop(0.7, `rgba(${rgb}, 0.08)`)
  glow.addColorStop(1, `rgba(${rgb}, 0)`)
  ctx.fillStyle = glow
  ctx.fillRect(-across, -across, across * 2, across * 2)
  ctx.restore()
}

function drawFront(ctx, { paper, ink, rec, sans }) {
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, W, H)
  drawGlow(ctx, rec)

  // The name as large as it fits, its descenders resting on the bottom margin.
  const lines = site.name.split(' ')
  setFont(ctx, sans, 100, -0.055)
  const widest = Math.max(...lines.map((line) => ctx.measureText(line).width))
  const size = Math.floor(((W - MARGIN * 2) / widest) * 100)
  setFont(ctx, sans, size, -0.055)
  ctx.fillStyle = ink
  const last = H - 96 - ctx.measureText(lines.at(-1)).actualBoundingBoxDescent
  const first = last - (lines.length - 1) * size * 0.92
  lines.forEach((line, i) => ctx.fillText(line, MARGIN - size * 0.04, first + i * size * 0.92))

  // Between the strap slot and the name, about a row's height clear of it.
  const pitch = (W - MARGIN * 2) / COLUMNS
  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      const isAccent = row === ROWS - ACCENT.fromBottom && column === ACCENT.column
      ctx.fillStyle = isAccent ? rec : ink
      ctx.globalAlpha = isAccent ? 1 : 0.08
      ctx.beginPath()
      ctx.arc(MARGIN + (column + 0.5) * pitch, GRID_TOP + (row + 0.5) * ROW_PITCH, DOT / 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}

function drawBack(ctx, { paper, ink, sans }) {
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, W, H)
  ctx.textAlign = 'center'

  // Monogram.
  const initials = site.name
    .split(' ')
    .map((word) => word[0])
    .join('')
  setFont(ctx, sans, 420, -0.06)
  ctx.fillStyle = ink
  ctx.fillText(initials, W / 2, H / 2 + 110)
}

// The strap: one plain tile of its colour, repeated along it by the Lanyard
// (without an image it would draw a woven texture with stitching).
function drawStrap() {
  const [element, ctx] = canvas(64, 64)
  ctx.fillStyle = '#111111'
  ctx.fillRect(0, 0, 64, 64)
  return element.toDataURL('image/png')
}

async function drawCard() {
  const css = getComputedStyle(document.documentElement)
  const value = (name) => css.getPropertyValue(name).trim()
  const theme = {
    paper: value('--surface'),
    ink: value('--ink'),
    rec: value('--rec'),
    sans: { family: value('--font-sans'), weight: 600 },
  }
  // A canvas draws with whatever font is loaded at that moment.
  await document.fonts.load(`600 100px ${theme.sans.family}`, site.name)

  const face = (draw) => {
    const [element, ctx] = canvas(W, H)
    draw(ctx)
    return element.toDataURL('image/png')
  }
  return {
    front: face((ctx) => drawFront(ctx, theme)),
    back: face((ctx) => drawBack(ctx, theme)),
    strap: drawStrap(),
    paper: theme.paper,
  }
}

// Placement (anchor, size, strapLength, watch…) is passed on to the Lanyard.
export default function IdCard(props) {
  const [card, setCard] = useState(null)

  useEffect(() => {
    let active = true
    drawCard().then((drawn) => active && setCard(drawn))
    return () => {
      active = false
    }
  }, [])

  if (!card) return null
  return (
    <Lanyard
      frontImage={card.front}
      backImage={card.back}
      strapImage={card.strap}
      cardColor={card.paper}
      {...props}
    />
  )
}
