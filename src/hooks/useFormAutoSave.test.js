import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import useFormAutoSave, { hasUserChanges } from './useFormAutoSave';
import { getFormDraft, saveFormDraft, stableDraftKey } from '../utils/indexDB';

describe('hasUserChanges', () => {
  const initial = { state: 'Bihar', visitDate: '2026-11-27', childAgeMonths: 0, names: [], responseMode: 'online' };

  it('ignores prefilled defaults and app-filled location fields', () => {
    expect(hasUserChanges({ ...initial }, initial)).toBe(false);
    expect(hasUserChanges({ ...initial, latitude: '21.1', longitude: '79.0', location: 'Patna', locationAccuracyMeters: 12, responseMode: 'offline' }, initial)).toBe(false);
    expect(hasUserChanges({ ...initial, caregiverName: '' }, initial)).toBe(false);
  });

  it('detects what the surveyor entered', () => {
    expect(hasUserChanges({ ...initial, caregiverName: 'Asha' }, initial)).toBe(true);
    expect(hasUserChanges({ ...initial, names: ['a'] }, initial)).toBe(true);
    expect(hasUserChanges({ ...initial, childAgeMonths: 7 }, initial)).toBe(true);
  });
});

// ── Hook behaviour (audit A06), rendered with react-dom only ───────────────────

describe('useFormAutoSave', () => {
  let container;
  let root;
  let api;

  function Harness({ values, enabled = true, formKey }) {
    api = useFormAutoSave('biannual', formKey, values, null, enabled, 50);
    return null;
  }

  const render = async (props) => {
    // Plain react-dom (no Testing Library in this project), so act() is required here.
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => { root.render(React.createElement(Harness, props)); });
  };

  beforeAll(() => { global.IS_REACT_ACT_ENVIRONMENT = true; });
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('samOwnerId', 'surveyor1');
    container = document.createElement('div');
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => { root.unmount(); });
    localStorage.clear();
  });

  it('forceSave resolves only after the draft is durably stored, under a stable per-account key', async () => {
    const formKey = stableDraftKey('biannual');
    await render({ formKey, values: { caregiverName: '' } });
    await render({ formKey, values: { caregiverName: 'Asha' } });
    let ok;
    await act(async () => { ok = await api.forceSave(); });
    expect(ok).toBe(true);
    expect((await getFormDraft('biannual__surveyor1')).formData).toEqual({ caregiverName: 'Asha' });
  });

  it('returns false from forceSave when storage fails, so callers keep the form open', async () => {
    const formKey = stableDraftKey('biannual');
    await render({ formKey, values: { caregiverName: 'Asha' } });
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    const logged = jest.spyOn(console, 'error').mockImplementation(() => {});
    let ok;
    try {
      await act(async () => { ok = await api.forceSave(); });
    } finally {
      setItem.mockRestore();
      logged.mockRestore();
    }
    expect(ok).toBe(false);
  });

  it('does not resurrect a cleared (submitted) draft when the screen closes', async () => {
    const formKey = stableDraftKey('biannual');
    await render({ formKey, values: { caregiverName: 'Asha' } });
    await act(async () => { await api.forceSave(); });
    await act(async () => { await api.clearDraft(); });
    await act(async () => { root.unmount(); });
    root = createRoot(container);
    await new Promise((r) => setTimeout(r, 0));
    expect(await getFormDraft(formKey)).toBeNull();
  });

  it('saves answers typed since the last auto-save when the screen closes (best effort)', async () => {
    const formKey = stableDraftKey('biannual');
    await render({ formKey, values: { caregiverName: '' } });
    await render({ formKey, values: { caregiverName: 'Typed just now' } });
    await act(async () => { root.unmount(); });
    root = createRoot(container);
    await new Promise((r) => setTimeout(r, 0));
    expect((await getFormDraft(formKey)).formData).toEqual({ caregiverName: 'Typed just now' });
  });

  it('never restores a draft that belongs to another account', async () => {
    localStorage.setItem('samOwnerId', 'surveyor2');
    await saveFormDraft('shared-key', 'biannual', { caregiverName: 'Theirs' });
    localStorage.setItem('samOwnerId', 'surveyor1');
    await render({ formKey: 'shared-key', values: {} });
    let draft;
    await act(async () => { draft = await api.loadDraft(); });
    expect(draft).toBeNull();
  });
});
