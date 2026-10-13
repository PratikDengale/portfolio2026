import { useLayoutEffect, useRef } from 'react'

let ctx

// Ink (glyph outline) extent of one line of text set in `style`, measured in
// px from the line's inline start. `size` overrides the font size.
function inkBounds(text, style, size = parseFloat(style.fontSize)) {
  ctx ??= document.createElement('canvas').getContext('2d')
  const tracking = ((parseFloat(style.letterSpacing) || 0) / parseFloat(style.fontSize)) * size
  const content = style.textTransform === 'uppercase' ? text.toUpperCase() : text
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${size}px ${style.fontFamily}`
  // Tracking moves the last glyph by (n - 1) gaps; add that by hand where the
  // canvas can't apply letter-spacing itself.
  const native = 'letterSpacing' in ctx
  if (native) ctx.letterSpacing = `${tracking}px`
  const m = ctx.measureText(content)
  const shift = native ? 0 : tracking * (content.length - 1)
  return { left: -m.actualBoundingBoxLeft, right: m.actualBoundingBoxRight + shift }
}

// Viewport x of the first and last ink edge of an element's single-line text.
function inkEdges(el) {
  const ink = inkBounds(el.textContent, getComputedStyle(el))
  const { left } = el.getBoundingClientRect()
  return { left: left + ink.left, right: left + ink.right }
}

// Sizes single-line text so its ink runs edge to edge. By default it fills
// the parent's content box; pass `alignStart` / `alignEnd` refs to pin the two
// ink edges to the ink edges of other text instead.
export function useFitText(text, { alignStart, alignEnd } = {}) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const box = el.parentElement

    const fit = () => {
      const boxStyle = getComputedStyle(box)
      const rect = box.getBoundingClientRect()
      const contentLeft = rect.left + parseFloat(boxStyle.paddingLeft)
      const start = alignStart?.current ? inkEdges(alignStart.current).left : contentLeft
      const end = alignEnd?.current
        ? inkEdges(alignEnd.current).right
        : rect.right - parseFloat(boxStyle.paddingRight)

      const probe = 100
      const ink = inkBounds(text, getComputedStyle(el), probe)
      const size = ((end - start) / (ink.right - ink.left)) * probe
      el.style.fontSize = `${size}px`
      el.style.marginLeft = `${start - contentLeft - (ink.left / probe) * size}px`
    }

    // Measuring against a fallback face gives the wrong size, so the text is
    // only marked as fitted (and revealed) once its own font is in.
    const style = getComputedStyle(el)
    const reveal = () => {
      fit()
      el.dataset.fitted = ''
    }
    document.fonts
      .load(`${style.fontStyle} ${style.fontWeight} 1em ${style.fontFamily}`, text)
      .then(reveal, reveal)

    // The labels we align to may swap fonts later.
    document.fonts.addEventListener('loadingdone', fit)
    const ro = new ResizeObserver(fit)
    ro.observe(box)
    return () => {
      document.fonts.removeEventListener('loadingdone', fit)
      ro.disconnect()
    }
  }, [text, alignStart, alignEnd])

  return ref
}
