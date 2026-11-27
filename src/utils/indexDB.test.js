import { deleteOfflineForm, getOfflineForms, saveOfflineForm } from './indexDB';

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
