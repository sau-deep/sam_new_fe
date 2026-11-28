import {
  REPLAY, CLAIM_PREFIX, CLAIM_TTL_MS, REPLAY_TIMEOUT_MS, claimOfflineRecord, releaseOfflineClaim, replayOfflineQueue,
  replayOfflineRecord, discardOfflineRecord, offlineRecordCopy, offlineRecordCopyText, offlineRecordCopyFilename,
  _setClaimSettleMs, _setReplayTimeouts,
} from './offlineReplay';
import {
  saveOfflineForm, getOfflineForms, markOfflineFormRejected, _setIDBTimeouts, _resetIDBStall,
} from '../../utils/indexDB';
import { installFakeIndexedDB, removeFakeIndexedDB } from '../../utils/fakeIndexedDB.testutil';

// The coordinator's default sender is never used here: every test passes `post`.
jest.mock('../../services/api', () => ({ __esModule: true, default: { post: jest.fn(), get: jest.fn() } }));

const signInAs = (loginId) => localStorage.setItem('samOwnerId', loginId);
const ok = () => ({ success: true, statusCode: 200, message: 'Saved', data: { id: 1 } });

async function queue(data, url = '/form/followup') {
  await saveOfflineForm({ url, data });
  const all = await getOfflineForms();
  return all.find((r) => JSON.stringify(r.data) === JSON.stringify(data));
}

beforeAll(() => _setClaimSettleMs(0));
beforeEach(() => { localStorage.clear(); signInAs('surveyor1'); });
afterAll(() => localStorage.clear());

describe('claims', () => {
  it('lets only one caller hold a record at a time and releases cleanly', async () => {
    const rec = await queue({ a: 1 });
    const first = await claimOfflineRecord(rec);
    expect(first).toBeTruthy();
    expect(await claimOfflineRecord(rec)).toBeNull(); // same tab, second timer
    expect(JSON.parse(localStorage.getItem(`${CLAIM_PREFIX}${rec.id}`)).token).toBe(first.token);
    releaseOfflineClaim(first);
    expect(localStorage.getItem(`${CLAIM_PREFIX}${rec.id}`)).toBeNull();
    const again = await claimOfflineRecord(rec);
    expect(again).toBeTruthy();
    releaseOfflineClaim(again);
  });

  it('does not send a record another tab has claimed, but takes over an expired claim', async () => {
    const rec = await queue({ a: 2 });
    const post = jest.fn().mockResolvedValue(ok());
    localStorage.setItem(`${CLAIM_PREFIX}${rec.id}`, JSON.stringify({ token: 'other-tab', expiresAt: Date.now() + 60000 }));
    expect((await replayOfflineRecord(rec.id, { post })).status).toBe(REPLAY.BUSY);
    expect(post).not.toHaveBeenCalled();

    localStorage.setItem(`${CLAIM_PREFIX}${rec.id}`, JSON.stringify({ token: 'other-tab', expiresAt: Date.now() - 1 }));
    expect((await replayOfflineRecord(rec.id, { post })).status).toBe(REPLAY.UPLOADED);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('backs off when another tab overwrites the claim before it settles', async () => {
    const rec = await queue({ a: 3 });
    _setClaimSettleMs(5);
    const pending = claimOfflineRecord(rec);
    localStorage.setItem(`${CLAIM_PREFIX}${rec.id}`, JSON.stringify({ token: 'other-tab', expiresAt: Date.now() + 60000 }));
    expect(await pending).toBeNull();
    _setClaimSettleMs(0);
  });

  it('sends each record once when manual, timer and reconnect uploads overlap', async () => {
    await queue({ n: 1 });
    await queue({ n: 2 });
    const post = jest.fn(() => new Promise((resolve) => setTimeout(() => resolve(ok()), 5)));
    const runs = await Promise.all([
      replayOfflineQueue({ post }),
      replayOfflineQueue({ automatic: true, post }),
      replayOfflineQueue({ automatic: true, post }),
    ]);
    expect(post).toHaveBeenCalledTimes(2);
    expect(runs[0].uploaded + runs[1].uploaded + runs[2].uploaded).toBe(2);
    expect(await getOfflineForms()).toEqual([]);
  });
});

describe('outcomes', () => {
  it('deletes exactly the uploaded record after a semantic success', async () => {
    const a = await queue({ n: 'a' });
    const b = await queue({ n: 'b' });
    const post = jest.fn(async (record) => (record.data.n === 'a' ? ok() : { success: true, statusCode: 500, message: 'DB down' }));
    const summary = await replayOfflineQueue({ post });
    expect(summary).toMatchObject({ uploaded: 1, failed: 1 });
    const left = await getOfflineForms();
    expect(left.map((r) => r.id)).toEqual([b.id]);
    expect(left[0].lastSyncAttempt.message).toBe('DB down');
    expect(left.find((r) => r.id === a.id)).toBeUndefined();
    // The clientSubmissionId and stored schema version travel with every send.
    expect(post.mock.calls[0][0]).toMatchObject({ clientSubmissionId: a.clientSubmissionId, formSchemaVersion: 2 });
  });

  it('parks a validation failure (HTTP 200, body 400) with the server reason and does not retry it', async () => {
    const rec = await queue({ childName: 'x'.repeat(90) });
    const post = jest.fn().mockResolvedValue({
      success: false, statusCode: 400, message: 'Child name is too long',
      data: { fieldErrors: { childName: 'At most 80 characters' } },
    });
    expect((await replayOfflineRecord(rec.id, { post })).status).toBe(REPLAY.REJECTED);
    const [parked] = await getOfflineForms();
    expect(parked.syncRejected).toMatchObject({
      message: 'Child name is too long', fieldErrors: { childName: 'At most 80 characters' }, statusCode: 400,
    });

    const summary = await replayOfflineQueue({ automatic: true, post });
    expect(post).toHaveBeenCalledTimes(1);
    expect(summary.needsAttention).toBe(1);

    // Only an explicit user retry sends it again.
    post.mockResolvedValue(ok());
    expect((await replayOfflineRecord(rec.id, { post })).status).toBe(REPLAY.SKIPPED);
    expect((await replayOfflineRecord(rec.id, { post, retryRejected: true })).status).toBe(REPLAY.UPLOADED);
    expect(await getOfflineForms()).toEqual([]);
  });

  it('parks an HTTP 400 rejection too', async () => {
    const rec = await queue({ a: 1 });
    const err = Object.assign(new Error('Request failed with status code 400'), {
      response: { status: 400, data: { success: false, statusCode: 400, message: 'Bad date' } },
    });
    const post = jest.fn().mockRejectedValue(err);
    const res = await replayOfflineRecord(rec.id, { post });
    expect(res).toMatchObject({ status: REPLAY.REJECTED, message: 'Bad date' });
  });

  it('keeps a record after a transient failure and retries it next time', async () => {
    const rec = await queue({ a: 1 });
    const post = jest.fn()
      .mockRejectedValueOnce(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }))
      .mockResolvedValueOnce({ success: false, statusCode: 429, message: 'Still saving the first copy' })
      .mockResolvedValueOnce(ok());
    expect((await replayOfflineQueue({ post })).failed).toBe(1);
    expect((await replayOfflineQueue({ post })).failed).toBe(1);
    const [kept] = await getOfflineForms();
    expect(kept).toMatchObject({ id: rec.id, clientSubmissionId: rec.clientSubmissionId, syncAttempts: 2 });
    expect(kept.syncRejected).toBeUndefined();
    expect((await replayOfflineQueue({ post })).uploaded).toBe(1);
    expect(post).toHaveBeenCalledTimes(3);
    // Every retry reused the same submission id, so the server can de-duplicate.
    expect(new Set(post.mock.calls.map(([r]) => r.clientSubmissionId))).toEqual(new Set([rec.clientSubmissionId]));
    expect(await getOfflineForms()).toEqual([]);
  });

  it('parks a 409 as a conflict and sends it again only as a new submission', async () => {
    const rec = await queue({ a: 1 });
    const post = jest.fn().mockResolvedValueOnce({ success: false, statusCode: 409, message: 'Id used for different data' });
    expect((await replayOfflineRecord(rec.id, { post })).status).toBe(REPLAY.CONFLICT);
    expect((await replayOfflineQueue({ post })).needsAttention).toBe(1);
    expect(post).toHaveBeenCalledTimes(1);

    post.mockResolvedValueOnce(ok());
    expect((await replayOfflineRecord(rec.id, { post, resendAsNew: true })).status).toBe(REPLAY.UPLOADED);
    expect(post.mock.calls[1][0].clientSubmissionId).not.toBe(rec.clientSubmissionId);
  });

  it('stops the run on an expired session', async () => {
    await queue({ n: 1 });
    await queue({ n: 2 });
    const post = jest.fn().mockRejectedValue(Object.assign(new Error('401'), { response: { status: 401, data: {} } }));
    const summary = await replayOfflineQueue({ post });
    expect(summary.authFailed).toBe(true);
    expect(post).toHaveBeenCalledTimes(1);
    expect(await getOfflineForms()).toHaveLength(2);
  });
});

describe('ownership', () => {
  it('never uploads another account\'s record or an unowned legacy record automatically', async () => {
    signInAs('surveyor2');
    await queue({ mine: false });
    localStorage.setItem('samv2_form_legacy-1', JSON.stringify({ url: '/form/routine', data: { legacy: true }, timestamp: 1 }));
    signInAs('surveyor1');
    const post = jest.fn().mockResolvedValue(ok());
    const summary = await replayOfflineQueue({ automatic: true, post });
    expect(post).not.toHaveBeenCalled();
    expect(summary.total).toBe(0);

    const [legacy] = (await getOfflineForms()).filter((r) => r.id === 'samv2_form_legacy-1');
    expect((await replayOfflineRecord(legacy.id, { post })).status).toBe(REPLAY.SKIPPED);
    expect((await replayOfflineRecord(legacy.id, { post, allowLegacy: true })).status).toBe(REPLAY.UPLOADED);
    expect(post.mock.calls[0][0].ownerId).toBe('surveyor1');
    expect((await getOfflineForms()).map((r) => r.ownerId)).toEqual(['surveyor2']);
  });
});

describe('with IndexedDB as the primary store', () => {
  afterEach(() => removeFakeIndexedDB());

  it('uploads and deletes an IndexedDB record exactly once', async () => {
    const idb = installFakeIndexedDB();
    const a = await queue({ n: 1 });
    await queue({ n: 2 });
    expect(a.storage).toBe('idb');
    const post = jest.fn().mockResolvedValue(ok());
    expect((await replayOfflineRecord(a.id, { post })).status).toBe(REPLAY.UPLOADED);
    expect(idb.stores.surveyForms.size).toBe(1);
    expect((await replayOfflineRecord(a.id, { post })).status).toBe(REPLAY.GONE);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('reports an upload whose local delete failed instead of claiming success', async () => {
    const idb = installFakeIndexedDB();
    const a = await queue({ n: 1 });
    const post = jest.fn(async () => { idb.failures.write = 'QuotaExceededError'; return ok(); });
    await expect(replayOfflineRecord(a.id, { post })).rejects.toThrow(/could not be removed/);
    idb.failures.write = null;
    // Still queued; the next send reuses the same clientSubmissionId so the server de-duplicates.
    const [kept] = await getOfflineForms();
    expect(kept.clientSubmissionId).toBe(a.clientSubmissionId);
    expect(localStorage.getItem(`${CLAIM_PREFIX}${a.id}`)).toBeNull();
  });
});

describe('cross-tab lock', () => {
  afterEach(() => { delete navigator.locks; });

  it('runs replay inside the Web Lock when the browser has one', async () => {
    const request = jest.fn((name, opts, cb) => (typeof opts === 'function' ? opts() : cb()));
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true });
    await queue({ n: 1 });
    const post = jest.fn().mockResolvedValue(ok());
    expect((await replayOfflineQueue({ post })).uploaded).toBe(1);
    expect(request).toHaveBeenCalledWith('sam-offline-replay', expect.anything(), expect.any(Function));
  });

  it('does not wait forever for a lock another (frozen) tab never releases', async () => {
    _setReplayTimeouts({ lockWaitMs: 20 });
    try {
      Object.defineProperty(navigator, 'locks', { value: { request: () => new Promise(() => {}) }, configurable: true });
      await queue({ n: 1 });
      const post = jest.fn().mockResolvedValue(ok());
      expect((await replayOfflineQueue({ post })).uploaded).toBe(1);
    } finally {
      _setReplayTimeouts({ lockWaitMs: 15000 });
    }
  });

  it('still uploads when the lock cannot be taken', async () => {
    Object.defineProperty(navigator, 'locks', {
      value: { request: () => Promise.reject(new Error('SecurityError')) }, configurable: true,
    });
    await queue({ n: 1 });
    const post = jest.fn().mockResolvedValue(ok());
    expect((await replayOfflineQueue({ post })).uploaded).toBe(1);
  });
});

describe('a step that never finishes cannot block the queue', () => {
  beforeEach(() => _setReplayTimeouts({ recordMs: 30, claimTtlMs: 80, listMs: 200 }));
  afterEach(() => {
    _setReplayTimeouts({ recordMs: REPLAY_TIMEOUT_MS + 60000, claimTtlMs: CLAIM_TTL_MS, listMs: 30000 });
    _setIDBTimeouts({ openMs: 8000, txMs: 10000 });
    _resetIDBStall();
    removeFakeIndexedDB();
  });

  it('keeps working when indexedDB.open never fires, and the next automatic run starts fresh', async () => {
    _setIDBTimeouts({ openMs: 20 });
    installFakeIndexedDB({ hangOpen: true });
    await queue({ n: 1 }); // stored in the localStorage fallback after the open times out
    const post = jest.fn().mockResolvedValue(ok());
    const first = replayOfflineQueue({ automatic: true, post });
    expect(replayOfflineQueue({ automatic: true, post })).toBe(first); // coalesced while waiting
    expect((await first).uploaded).toBe(1);
    const second = replayOfflineQueue({ automatic: true, post });
    expect(second).not.toBe(first); // pendingAutoRun was reset
    await expect(second).resolves.toMatchObject({ total: 0 });
  });

  it('gives up on a hung upload, lets the next replay run, and retries once the claim expires', async () => {
    const stuck = await queue({ n: 'stuck' });
    const post = jest.fn(async (record) => (record.data.n === 'stuck' ? new Promise(() => {}) : ok()));
    await expect(replayOfflineRecord(stuck.id, { post })).rejects.toThrow(/timed out/);

    await queue({ n: 'next' });
    const summary = await replayOfflineQueue({ post });
    expect(summary.uploaded).toBe(1);   // the chain moved on
    expect(summary.busy).toBe(1);       // the hung one is still claimed: not sent twice
    expect(post).toHaveBeenCalledTimes(2);

    await new Promise((r) => setTimeout(r, 100)); // claim expires
    post.mockImplementation(async () => ok());
    expect((await replayOfflineQueue({ post })).uploaded).toBe(1);
    expect(await getOfflineForms()).toEqual([]);
  });

  it('a failed automatic run does not leave the automatic trigger stuck', async () => {
    // Listing the queue hangs (an IndexedDB transaction that never completes) past listMs.
    _setReplayTimeouts({ listMs: 20 });
    _setIDBTimeouts({ txMs: 150 });
    installFakeIndexedDB({ hangTx: true });
    const first = replayOfflineQueue({ automatic: true, post: jest.fn() });
    await expect(first).rejects.toThrow(/Reading the offline queue timed out/);
    const second = replayOfflineQueue({ automatic: true, post: jest.fn() });
    expect(second).not.toBe(first);
    await second.catch(() => {});
  });
});

describe('parked records: copy, then remove only on request', () => {
  it('builds a readable copy with the request, the server reason and a descriptive file name', async () => {
    const rec = await queue({ childName: 'Asha', note: 'line 1, line 2' });
    await markOfflineFormRejected(rec, { message: 'Child name too long', fieldErrors: { childName: 'Max 80' }, statusCode: 400 });
    const [parked] = await getOfflineForms();
    const copy = offlineRecordCopy(parked);
    expect(copy).toMatchObject({
      form: 'Follow-up Assessment',
      url: '/form/followup',
      clientSubmissionId: rec.clientSubmissionId,
      savedBy: 'surveyor1',
      formSchemaVersion: 2,
      serverProblem: { kind: 'rejected', message: 'Child name too long', fieldErrors: { childName: 'Max 80' } },
      request: { childName: 'Asha', note: 'line 1, line 2' },
    });
    expect(JSON.parse(offlineRecordCopyText(parked)).request).toEqual(rec.data);
    expect(offlineRecordCopyFilename(parked)).toMatch(new RegExp(`^SAM_followup_\\d{4}-\\d{2}-\\d{2}_${rec.clientSubmissionId}\\.json$`));
  });

  it('removes only a parked record of this account, exactly that one, and only when asked', async () => {
    const parked = await queue({ n: 'parked' });
    const pending = await queue({ n: 'pending' });
    await markOfflineFormRejected(parked, { message: 'Missing section' });

    expect((await discardOfflineRecord(pending.id)).status).toBe(REPLAY.SKIPPED); // not parked
    expect((await discardOfflineRecord(parked.id)).status).toBe(REPLAY.REMOVED);
    expect((await getOfflineForms()).map((r) => r.id)).toEqual([pending.id]);

    signInAs('surveyor2');
    const theirs = await queue({ n: 'theirs' });
    await markOfflineFormRejected(theirs, { message: 'x' });
    signInAs('surveyor1');
    expect((await discardOfflineRecord(theirs.id)).status).toBe(REPLAY.SKIPPED);
    expect(await getOfflineForms()).toHaveLength(2);
  });

  it('never removes a parked record on its own', async () => {
    const rec = await queue({ n: 1 });
    await markOfflineFormRejected(rec, { message: 'Missing section' });
    const post = jest.fn().mockResolvedValue(ok());
    await replayOfflineQueue({ automatic: true, post });
    await replayOfflineQueue({ post });
    expect(post).not.toHaveBeenCalled();
    expect(await getOfflineForms()).toHaveLength(1);
  });
});
