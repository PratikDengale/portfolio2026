import { useSyncExternalStore } from 'react'

// Whether the hero's intro (the preloader) has finished, or was skipped.
// Heavy work elsewhere on the page waits for it rather than stalling the
// preloader's animation mid-move.
let done = false
const listeners = new Set()

export function markIntroDone() {
  if (done) return
  done = true
  listeners.forEach((notify) => notify())
}

const subscribe = (notify) => {
  listeners.add(notify)
  return () => listeners.delete(notify)
}

export const useIntroDone = () => useSyncExternalStore(subscribe, () => done)
