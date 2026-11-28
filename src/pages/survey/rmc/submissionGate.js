// One submission at a time, and none after a confirmed save (send or queue).
//
// The page navigates away 1–2 s after a success. Until then the same answers must
// not be sent or queued again (a second tap would create a duplicate under a new
// clientSubmissionId). React state updates are asynchronous, so the gate is a
// plain object kept in a ref and checked synchronously by every entry point.

export function createSubmissionGate() {
  let state = 'idle'; // 'idle' | 'busy' | 'done'
  return {
    /** Start an attempt. False while another attempt runs or after a success. */
    tryBegin() {
      if (state !== 'idle') return false;
      state = 'busy';
      return true;
    },
    /** The attempt did not save anything: allow another one. */
    fail() {
      if (state === 'busy') state = 'idle';
    },
    /** Saved (server confirmed or queued on the device): no further attempts. */
    succeed() {
      state = 'done';
    },
    get isBusy() { return state === 'busy'; },
    get isDone() { return state === 'done'; },
  };
}

/**
 * Run `attempt` under the gate. Returns undefined without calling it when the
 * gate is closed; an attempt that did not call succeed() re-opens the gate.
 */
export async function runGated(gate, attempt) {
  if (!gate.tryBegin()) return undefined;
  try {
    return await attempt();
  } finally {
    if (!gate.isDone) gate.fail();
  }
}

/** Submit / Save Offline / Retry are usable only when nothing is running and nothing was saved. */
export function canSubmitAgain({ gate, loading, submitted }) {
  return !loading && !submitted && !gate.isBusy && !gate.isDone;
}
