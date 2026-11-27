import {
  deleteOfflineForm, getOfflineForms, saveOfflineForm, offlineFormOwnership, claimLegacyOfflineForm,
  ensureClientSubmissionId, stableDraftKey, saveFormDraft, getFormDraft, deleteFormDraft, getAllFormDrafts, cleanupOldDrafts,
  markOfflineFormConflict, resendAsNewSubmission,
} from './indexDB';
import { FORM_SCHEMA_VERSIONS } from '../constants/releaseInfo';

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
