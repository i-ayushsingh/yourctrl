/**
 * Simple client-side rate limiter to prevent spam submissions.
 * Checks localStorage for submission timestamps per action type.
 */
export function checkRateLimit(actionKey: string, cooldownSeconds = 30): { allowed: boolean; waitSeconds: number } {
  const now = Date.now();
  const storageKey = `yourctrl_ratelimit_${actionKey}`;
  const lastTimeStr = localStorage.getItem(storageKey);

  if (lastTimeStr) {
    const lastTime = parseInt(lastTimeStr, 10);
    const elapsedSeconds = Math.floor((now - lastTime) / 1000);
    if (elapsedSeconds < cooldownSeconds) {
      return { allowed: false, waitSeconds: cooldownSeconds - elapsedSeconds };
    }
  }

  localStorage.setItem(storageKey, now.toString());
  return { allowed: true, waitSeconds: 0 };
}
