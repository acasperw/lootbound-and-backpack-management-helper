/**
 * Thin wrapper around the Google Analytics `gtag.js` global. The tag itself is
 * loaded in index.html; this module provides a typed, no-op-safe way to send
 * custom events so tracking calls don't break when the script is blocked or
 * absent (e.g. ad blockers, local dev).
 */

type GtagArgs =
  | ['event', string, Record<string, unknown>?]
  | ['config', string, Record<string, unknown>?]
  | ['js', Date];

declare global {
  interface Window {
    gtag?: (...args: GtagArgs) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Reports a user interaction to Google Analytics.
 *
 * @param action - The event name (e.g. `auto_fit`, `switch_stash`).
 * @param params - Optional extra parameters attached to the event.
 */
export function trackEvent(action: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', action, params);
}
