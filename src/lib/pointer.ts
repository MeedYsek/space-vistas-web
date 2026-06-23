/**
 * A tiny global pointer store shared across WebGL layers.
 *
 * The canvas has `pointer-events: none` (so the DOM overlay stays clickable),
 * which means R3F's built-in pointer won't update. Instead we listen on
 * `window` and expose normalised (-1..1) raw values plus eased values that the
 * Scene advances once per frame. Every parallax layer reads the same eased
 * pointer for a coherent, floaty feel.
 *
 * On touch devices the device-orientation (gyro) handler feeds the same store,
 * so downstream code never needs to care where the motion came from.
 */
export const pointer = {
  /** Raw target, normalised to [-1, 1]. */
  tx: 0,
  ty: 0,
  /** Eased / smoothed values the layers actually consume. */
  ex: 0,
  ey: 0,
}

let bound = false

/** Smoothly advance eased values toward the raw target. Call once per frame. */
export function easePointer(ease = 0.06) {
  pointer.ex += (pointer.tx - pointer.ex) * ease
  pointer.ey += (pointer.ty - pointer.ey) * ease
}

function onMouseMove(e: MouseEvent) {
  pointer.tx = (e.clientX / window.innerWidth) * 2 - 1
  pointer.ty = (e.clientY / window.innerHeight) * 2 - 1
}

function onDeviceOrientation(e: DeviceOrientationEvent) {
  // gamma: left/right [-90,90], beta: front/back [-180,180]. Clamp to a gentle range.
  const gamma = (e.gamma ?? 0) / 45
  const beta = ((e.beta ?? 0) - 45) / 45
  pointer.tx = Math.max(-1, Math.min(1, gamma))
  pointer.ty = Math.max(-1, Math.min(1, beta))
}

/** Idempotently attach the listeners. Returns a disposer. */
export function bindPointer(): () => void {
  if (bound) return () => {}
  bound = true
  window.addEventListener('mousemove', onMouseMove, { passive: true })
  window.addEventListener('deviceorientation', onDeviceOrientation, { passive: true })
  return () => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('deviceorientation', onDeviceOrientation)
    bound = false
  }
}
