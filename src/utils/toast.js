import { message } from "antd";

/**
 * Sequential toasts.
 *
 * Several independent places react to the same event — e.g. a network toggle
 * makes the header announce the new mode while OfflineDrawer reports on the
 * upload it kicks off. antd stacks concurrent `message` calls vertically, which
 * on a phone (long strings wrapping to two or three lines each) reads as one
 * illegible pile covering the header.
 *
 * `installToastQueue()` redirects antd's `message` singleton through this queue,
 * so every existing `message.success(...)` call site across the app is
 * serialised without having to be rewritten. Call it once at startup.
 */

/** Seconds a toast stays up. Slightly under antd's default of 3 so a run of them clears faster. */
const DEFAULT_DURATION = 2.5;

/** Pause between toasts, so two in a row read as separate events. */
const GAP_MS = 300;

/**
 * Past this depth the queue would keep showing toasts long after the user has
 * moved on, so extras are dropped rather than queued behind stale news.
 */
const MAX_PENDING = 4;

// Captured before `installToastQueue` swaps the methods out, so the queue can
// still reach the real antd implementation without recursing into itself.
const native = {
  success: message.success.bind(message),
  info: message.info.bind(message),
  warning: message.warning.bind(message),
  error: message.error.bind(message),
};

let chain = Promise.resolve();
/** Contents currently queued or on screen, used to collapse duplicates. */
const inFlight = [];

function enqueue(type, content, duration = DEFAULT_DURATION) {
  // A component re-rendering or two sources reporting the same outcome should
  // not cost the user two full toast durations to read the same sentence twice.
  const key = `${type}:${content}`;
  if (inFlight.includes(key)) return;

  if (inFlight.length >= MAX_PENDING) {
    console.warn("[toast] queue full, dropping:", content);
    return;
  }

  inFlight.push(key);
  const release = () => {
    const i = inFlight.indexOf(key);
    if (i !== -1) inFlight.splice(i, 1);
  };

  chain = chain
    .then(
      () =>
        new Promise((resolve) => {
          native[type](content, duration);
          setTimeout(resolve, duration * 1000 + GAP_MS);
        }),
    )
    .then(release, release);
}

export const toast = {
  success: (content, duration) => enqueue("success", content, duration),
  info: (content, duration) => enqueue("info", content, duration),
  warning: (content, duration) => enqueue("warning", content, duration),
  error: (content, duration) => enqueue("error", content, duration),
};

let installed = false;

/**
 * Route antd's `message.success|info|warning|error` through the queue.
 *
 * Safe for this codebase because every call site passes a single string and
 * none uses the returned handle, `message.loading`, or `message.useMessage`.
 * Revisit if that changes.
 */
export function installToastQueue() {
  if (installed) return;
  installed = true;
  Object.keys(native).forEach((type) => {
    message[type] = (content, duration) =>
      enqueue(type, content, typeof duration === "number" ? duration : undefined);
  });
}

export default toast;
