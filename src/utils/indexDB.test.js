import {
  deleteOfflineForm, getOfflineForms, saveOfflineForm, offlineFormOwnership, claimLegacyOfflineForm,
  ensureClientSubmissionId, stableDraftKey, saveFormDraft, getFormDraft, deleteFormDraft, getAllFormDrafts, cleanupOldDrafts,
  markOfflineFormConflict, resendAsNewSubmission,
  deleteOfflineSubmission, findOfflineForm, markOfflineFormRejected, clearOfflineFormRejection,
  recordOfflineFormAttempt, _setIDBTimeouts, _resetIDBStall,
} from './indexDB';
import { FORM_SCHEMA_VERSIONS } from '../constants/releaseInfo';
import { installFakeIndexedDB, removeFakeIndexedDB } from './fakeIndexedDB.testutil';

// The owner of local data is the LOGIN ID (samOwnerId), never the display name (iegUsername).
const signInAs = loginId => localStorage.setItem('samOwnerId', loginId);

it('preserves capture metadata and removes the queued survey after upload when IndexedDB is unavailable', async () => {
  const data = {
    latitude: 21.1458,
    longitude: 79.0882,
    locationAccuracyMeters: 24,
    locationCapturedAt: '2026-11-27T09:00:00.000Z',
    responseMode: 'offline'
  };

  localStorage.clear();
  try {
    await saveOfflineForm({ url: '/form/household', data });
    const [queued] = await getOfflineForms();
    expect(queued).toMatchObject({ url: '/form/household', data });
    expect(await deleteOfflineForm(queued.id)).toBe(true);
    expect(await getOfflineForms()).toEqual([]);
  } finally {
    localStorage.clear();
  }
});

describe('ownership, ids and drafts (localStorage fallback)', () => {
  beforeEach(() => localStorage.clear());
  afterAll(() => localStorage.clear());

  it('stamps new queued records with owner and a stable client id', async () => {
    signInAs('surveyor1');
    await saveOfflineForm({ url: '/form/followup', data: { a: 1 } });
    const [rec] = await getOfflineForms();
    expect(rec.ownerId).toBe('surveyor1');
    expect(rec.clientSubmissionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(rec.id).toBe(`samv2_form_${rec.clientSubmissionId}`);
    expect(offlineFormOwnership(rec)).toBe('mine');
    signInAs('surveyor2');
    expect(offlineFormOwnership(rec)).toBe('other');
  });

  it('two accounts with the same display name are still different owners', async () => {
    localStorage.setItem('iegUsername', 'Same Name');
    signInAs('surveyor1@x.in');
    await saveOfflineForm({ url: '/form/household', data: { a: 1 } });
    const [rec] = await getOfflineForms();
    expect(rec.ownerId).toBe('surveyor1@x.in');
    signInAs('surveyor2@x.in'); // display name unchanged
    expect(offlineFormOwnership(rec)).toBe('other');
    expect(stableDraftKey('biannual')).toBe('biannual__surveyor2@x.in');
  });

  it('stamps the form schema version on queued records and drafts', async () => {
    signInAs('surveyor1');
    await saveOfflineForm({ url: '/form/routine', data: {} });
    const [rec] = await getOfflineForms();
    expect(rec.formSchemaVersion).toBe(FORM_SCHEMA_VERSIONS.routine);
    await saveFormDraft('k', 'routinemonitoring', {});
    expect((await getFormDraft('k')).formSchemaVersion).toBe(FORM_SCHEMA_VERSIONS.routine);
  });

  it('parks a 409 conflict and resends only as a new submission', async () => {
    signInAs('surveyor1');
    await saveOfflineForm({ url: '/form/followup', data: { a: 1 } });
    const [rec] = await getOfflineForms();
    await markOfflineFormConflict(rec, 'different data');
    const [parked] = await getOfflineForms();
    expect(parked.syncConflict.message).toBe('different data');
    expect(parked.clientSubmissionId).toBe(rec.clientSubmissionId);
    const resent = await resendAsNewSubmission(parked);
    const [reread] = await getOfflineForms();
    expect(reread.syncConflict).toBeNull();
    expect(reread.clientSubmissionId).not.toBe(rec.clientSubmissionId);
    expect(reread.previousSubmissionIds).toEqual([rec.clientSubmissionId]);
    expect(resent.clientSubmissionId).toBe(reread.clientSubmissionId);
  });

  it('treats legacy records as unowned until explicitly claimed', async () => {
    localStorage.setItem('samv2_form_123-abc', JSON.stringify({ url: '/form/routine', data: { b: 2 }, timestamp: 1 }));
    signInAs('surveyor1');
    const [legacy] = await getOfflineForms();
    expect(offlineFormOwnership(legacy)).toBe('legacy');
    const claimed = await claimLegacyOfflineForm(legacy);
    expect(claimed.ownerId).toBe('surveyor1');
    const [reread] = await getOfflineForms();
    expect(reread.ownerId).toBe('surveyor1');
    expect(reread.clientSubmissionId).toBe(claimed.clientSubmissionId);
    expect(reread.id).toBe('samv2_form_123-abc');
  });

  it('assigns and persists a client id before the first retry', async () => {
    localStorage.setItem('samv2_form_old', JSON.stringify({ url: '/form/routine', data: {}, ownerId: 'u' }));
    const [rec] = await getOfflineForms();
    const withId = await ensureClientSubmissionId(rec);
    const [reread] = await getOfflineForms();
    expect(reread.clientSubmissionId).toBe(withId.clientSubmissionId);
  });

  it('keeps fallback drafts discoverable and never deletes them by age', async () => {
    signInAs('surveyor1');
    const key = stableDraftKey('biannual');
    expect(key).toBe('biannual__surveyor1');
    await saveFormDraft(key, 'biannual', { name: 'x' });
    localStorage.setItem('samv2_draft_old', JSON.stringify({ formKey: 'old', formType: 'routinemonitoring', formData: {}, lastModified: 1 }));
    expect(await cleanupOldDrafts()).toBe(0);
    const all = await getAllFormDrafts();
    expect(all.map(d => d.formKey).sort()).toEqual(['biannual__surveyor1', 'old']);
    expect((await getFormDraft(key)).formData).toEqual({ name: 'x' });
    await deleteFormDraft(key);
    expect(await getFormDraft(key)).toBeNull();
  });
});

describe('cleanupOldDrafts', () => {
  beforeEach(() => localStorage.clear());
  afterAll(() => localStorage.clear());

  it('removes only old drafts left under legacy random keys', async () => {
    const old = Date.now() - 8 * 24 * 60 * 60 * 1000;
    localStorage.setItem('samv2_draft_biannual_1732000000000_/surveys/biannual', JSON.stringify({ formKey: 'biannual_1732000000000_/surveys/biannual', formData: {}, lastModified: old }));
    localStorage.setItem('samv2_draft_biannual_1764000000000_/surveys/biannual', JSON.stringify({ formKey: 'biannual_1764000000000_/surveys/biannual', formData: {}, lastModified: Date.now() }));
    localStorage.setItem('samv2_draft_biannual__surveyor1', JSON.stringify({ formKey: 'biannual__surveyor1', formData: {}, lastModified: old }));
    expect(await cleanupOldDrafts()).toBe(1);
    expect((await getAllFormDrafts()).map(d => d.formKey).sort()).toEqual(['biannual_1764000000000_/surveys/biannual', 'biannual__surveyor1']);
  });
});

// ── IndexedDB primary store (fake) + localStorage fallback (audit A07) ─────────

describe('durable queue with IndexedDB and the localStorage fallback', () => {
  beforeEach(() => { localStorage.clear(); signInAs('surveyor1'); });
  afterEach(() => removeFakeIndexedDB());
  afterAll(() => localStorage.clear());

  it('writes to IndexedDB when it works and reports success only after commit', async () => {
    const idb = installFakeIndexedDB();
    await expect(saveOfflineForm({ url: '/form/household', data: { a: 1 } })).resolves.toBe(true);
    expect(idb.stores.surveyForms.size).toBe(1);
    expect(Object.keys(localStorage).filter(k => k.startsWith('samv2_form_'))).toEqual([]);
    const [rec] = await getOfflineForms();
    expect(rec).toMatchObject({ storage: 'idb', url: '/form/household', ownerId: 'surveyor1' });
    expect(typeof rec.id).toBe('number');
  });

  it('keeps a record written to the fallback while IndexedDB failed visible after it recovers', async () => {
    installFakeIndexedDB({ open: true }); // IndexedDB failing
    await saveOfflineForm({ url: '/form/followup', data: { fallback: true } });
    removeFakeIndexedDB();
    installFakeIndexedDB(); // recovered
    await saveOfflineForm({ url: '/form/followup', data: { primary: true } });
    const all = await getOfflineForms();
    expect(all.map(r => r.storage).sort()).toEqual(['idb', 'local']);
    expect(all.map(r => r.data)).toEqual(expect.arrayContaining([{ fallback: true }, { primary: true }]));
    // The fallback record has a stable, unique id usable for an exact delete.
    const local = all.find(r => r.storage === 'local');
    expect(local.id).toBe(`samv2_form_${local.clientSubmissionId}`);
    expect(await findOfflineForm(local.id)).toMatchObject({ data: { fallback: true } });
  });

  it('shows a submission stored in both stores once (same clientSubmissionId)', async () => {
    const idb = installFakeIndexedDB();
    await saveOfflineForm({ url: '/form/routine', data: { x: 1 } });
    const [rec] = await getOfflineForms();
    const { id, storage, ...copy } = rec;
    localStorage.setItem(`samv2_form_${rec.clientSubmissionId}`, JSON.stringify(copy));
    const all = await getOfflineForms();
    expect(all).toHaveLength(1);
    expect(all[0].storage).toBe('idb');
    expect(idb.stores.surveyForms.size).toBe(1);
  });

  it('deletes exactly the uploaded submission and its stray copy, nothing else', async () => {
    const idb = installFakeIndexedDB();
    await saveOfflineForm({ url: '/form/routine', data: { n: 1 } });
    await saveOfflineForm({ url: '/form/routine', data: { n: 2 } });
    const [first, second] = await getOfflineForms();
    const { id, storage, ...copy } = first;
    localStorage.setItem(`samv2_form_${first.clientSubmissionId}`, JSON.stringify(copy));

    await expect(deleteOfflineSubmission(first)).resolves.toBe(true);
    const left = await getOfflineForms();
    expect(left.map(r => r.clientSubmissionId)).toEqual([second.clientSubmissionId]);
    expect(localStorage.getItem(`samv2_form_${first.clientSubmissionId}`)).toBeNull();
    expect(idb.stores.surveyForms.size).toBe(1);
  });

  it('throws when neither store can hold the record (quota / aborted transaction)', async () => {
    installFakeIndexedDB({ write: 'QuotaExceededError' });
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw Object.assign(new Error('QuotaExceededError'), { name: 'QuotaExceededError' });
    });
    try {
      await expect(saveOfflineForm({ url: '/form/household', data: { a: 1 } })).rejects.toThrow('Could not store offline survey');
      await expect(saveFormDraft('k', 'biannual', { a: 1 })).rejects.toThrow('Could not store form draft');
    } finally {
      setItem.mockRestore();
    }
    expect(await getOfflineForms()).toEqual([]);
  });

  it('surfaces an aborted IndexedDB update as an error instead of pretending it was saved', async () => {
    const idb = installFakeIndexedDB();
    await saveOfflineForm({ url: '/form/household', data: { a: 1 } });
    const [rec] = await getOfflineForms();
    idb.failures.write = 'QuotaExceededError';
    await expect(markOfflineFormConflict(rec, 'x')).rejects.toMatchObject({ name: 'QuotaExceededError' });
    await expect(deleteOfflineForm(rec.id)).resolves.toBe(false);
    idb.failures.write = null;
    expect(await getOfflineForms()).toHaveLength(1);
  });

  it('falls back to localStorage when IndexedDB aborts the write', async () => {
    installFakeIndexedDB({ write: 'QuotaExceededError' });
    await expect(saveOfflineForm({ url: '/form/biannual', data: { a: 1 } })).resolves.toBe(true);
    const [rec] = await getOfflineForms();
    expect(rec.storage).toBe('local');
  });
});

describe('parking and attempt bookkeeping', () => {
  beforeEach(() => { localStorage.clear(); signInAs('surveyor1'); });
  afterAll(() => localStorage.clear());

  it('parks a validation failure with the server reason and clears it on request', async () => {
    await saveOfflineForm({ url: '/form/followup', data: { a: 1 } });
    const [rec] = await getOfflineForms();
    await markOfflineFormRejected(rec, { message: 'Child name too long', fieldErrors: { childName: 'Max 80' }, statusCode: 400 });
    const [parked] = await getOfflineForms();
    expect(parked.syncRejected).toMatchObject({ message: 'Child name too long', fieldErrors: { childName: 'Max 80' }, statusCode: 400 });
    expect(parked.clientSubmissionId).toBe(rec.clientSubmissionId);
    await clearOfflineFormRejection(parked);
    const [cleared] = await getOfflineForms();
    expect(cleared.syncRejected).toBeNull();
  });

  it('records transient attempts without parking', async () => {
    await saveOfflineForm({ url: '/form/followup', data: { a: 1 } });
    const [rec] = await getOfflineForms();
    await recordOfflineFormAttempt(rec, 'Network Error');
    const [again] = await getOfflineForms();
    await recordOfflineFormAttempt(again, 'timeout');
    const [reread] = await getOfflineForms();
    expect(reread.syncAttempts).toBe(2);
    expect(reread.lastSyncAttempt.message).toBe('timeout');
    expect(reread.syncRejected).toBeUndefined();
  });
});

describe('saveOfflineForm with a caller-supplied submission id', () => {
  beforeEach(() => { localStorage.clear(); signInAs('surveyor1'); });
  afterAll(() => localStorage.clear());

  it('keeps the id an online attempt already used', async () => {
    await saveOfflineForm({ url: '/form/household', data: { a: 1 }, clientSubmissionId: 'online-attempt-1' });
    const [rec] = await getOfflineForms();
    expect(rec.clientSubmissionId).toBe('online-attempt-1');
    expect(rec.id).toBe('samv2_form_online-attempt-1');
  });
});

describe('IndexedDB that never answers (some Android WebViews)', () => {
  beforeEach(() => {
    localStorage.clear();
    signInAs('surveyor1');
    _setIDBTimeouts({ openMs: 20, txMs: 20, stallMs: 60000 });
  });
  afterEach(() => {
    removeFakeIndexedDB();
    _resetIDBStall();
    _setIDBTimeouts({ openMs: 8000, txMs: 10000, stallMs: 60000 });
  });

  it('times out a hung open, falls back to localStorage, and stops waiting on it', async () => {
    const idb = installFakeIndexedDB({ hangOpen: true });
    const started = Date.now();
    await expect(saveOfflineForm({ url: '/form/followup', data: { a: 1 } })).resolves.toBe(true);
    const all = await getOfflineForms();
    expect(all).toHaveLength(1);
    expect(all[0].storage).toBe('local');
    // Only the first call waited for the open; later ones skip IndexedDB at once.
    expect(idb.openCalls).toBe(1);
    expect(Date.now() - started).toBeLessThan(2000);
    await expect(saveFormDraft('k', 'biannual', { a: 1 })).resolves.toBe(true);
    expect((await getFormDraft('k')).formData).toEqual({ a: 1 });
  });

  it('times out a transaction that never completes and falls back', async () => {
    installFakeIndexedDB({ hangTx: true });
    await expect(saveOfflineForm({ url: '/form/household', data: { b: 2 } })).resolves.toBe(true);
    const all = await getOfflineForms();
    expect(all.map(r => r.storage)).toEqual(['local']);
  });
});
