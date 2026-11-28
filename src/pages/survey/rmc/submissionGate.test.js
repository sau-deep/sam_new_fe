import { createSubmissionGate, runGated, canSubmitAgain } from './submissionGate';

describe('submission gate (no duplicate after success)', () => {
  it('blocks a second tap while the first attempt is running', async () => {
    const gate = createSubmissionGate();
    let release;
    const sends = [];
    const first = runGated(gate, () => new Promise((resolve) => { sends.push('A'); release = resolve; }));
    const second = await runGated(gate, async () => { sends.push('B'); });
    expect(second).toBeUndefined();
    release();
    await first;
    expect(sends).toEqual(['A']);
  });

  it('after a confirmed save no Submit, Retry or Save Offline runs again before navigation', async () => {
    const gate = createSubmissionGate();
    const sends = [];
    await runGated(gate, async () => { sends.push('submit'); gate.succeed(); });
    await runGated(gate, async () => { sends.push('second tap'); });
    await runGated(gate, async () => { sends.push('save offline'); });
    expect(sends).toEqual(['submit']);
    expect(canSubmitAgain({ gate, loading: false, submitted: true })).toBe(false);
    expect(canSubmitAgain({ gate, loading: false, submitted: false })).toBe(false);
  });

  it('a failed attempt (or a thrown error) allows Retry', async () => {
    const gate = createSubmissionGate();
    await runGated(gate, async () => { /* server error: nothing saved */ });
    expect(canSubmitAgain({ gate, loading: false, submitted: false })).toBe(true);
    await expect(runGated(gate, async () => { throw new Error('network'); })).rejects.toThrow('network');
    expect(gate.isBusy).toBe(false);
    let retried = false;
    await runGated(gate, async () => { retried = true; });
    expect(retried).toBe(true);
  });
});
