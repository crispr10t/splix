export function hapticTap(pattern = 10) {
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch { /* vibration is optional */ }
  }
}
