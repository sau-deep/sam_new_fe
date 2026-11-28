// axios 1.x ships ESM as its package "main"; CRA's Jest does not transform
// node_modules, so use axios's own CommonJS build here.
jest.mock('axios', () => jest.requireActual('axios/dist/browser/axios.cjs'));

/* eslint-disable import/first */
import api, { clearApiCache, _apiCacheSize } from './axiosInstance';
/* eslint-enable import/first */

const signInAs = (loginId) => localStorage.setItem('samOwnerId', loginId);

// A fake server: every call is recorded; the reply is decided per test.
let calls;
let reply;
function fakeServer(config) {
  calls.push(config.url);
  return Promise.resolve(reply(config)).then((r) => ({
    data: r.data,
    status: r.status ?? 200,
    statusText: 'OK',
    headers: {},
    config,
  }));
}

const okBody = (data) => ({ success: true, statusCode: 200, message: 'ok', data });

let now;
beforeEach(() => {
  localStorage.clear();
  clearApiCache();
  calls = [];
  reply = () => ({ data: okBody(`for:${localStorage.getItem('samOwnerId')}`) });
  api.defaults.adapter = fakeServer;
  now = 1_000_000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
});
afterEach(() => jest.restoreAllMocks());

it('serves a repeated GET from the cache for the same account', async () => {
  signInAs('a@x.in');
  await api.get('/survey/daily-submissions-count');
  const second = await api.get('/survey/daily-submissions-count');
  expect(calls).toHaveLength(1);
  expect(second.data.data).toBe('for:a@x.in');
});

it('scopes cached responses to the signed-in account', async () => {
  signInAs('a@x.in');
  await api.get('/survey/daily-submissions-count');
  signInAs('b@x.in');
  const res = await api.get('/survey/daily-submissions-count');
  expect(calls).toHaveLength(2);
  expect(res.data.data).toBe('for:b@x.in');
});

it('clears everything cached for the previous account when the account changes', async () => {
  signInAs('a@x.in');
  await api.get('/one');
  expect(_apiCacheSize()).toBe(1);
  signInAs('b@x.in');
  await api.get('/two');
  expect(_apiCacheSize()).toBe(1); // only b's entry is left
  signInAs('a@x.in');
  await api.get('/one');
  expect(calls).toEqual(['/one', '/two', '/one']);
});

it('never renews an entry on a cache hit', async () => {
  signInAs('a@x.in');
  await api.get('/poll');            // cached at t0, expires t0 + 5 min
  now += 4 * 60 * 1000;
  await api.get('/poll');            // hit
  now += 2 * 60 * 1000;              // t0 + 6 min: past the original expiry
  await api.get('/poll');
  expect(calls).toEqual(['/poll', '/poll']);
});

it('does not cache a response that was requested under a previous account', async () => {
  signInAs('a@x.in');
  let release;
  reply = () => new Promise((resolve) => { release = () => resolve({ data: okBody('for:a@x.in') }); });
  const inFlight = api.get('/survey/daily-submissions-count');
  await new Promise((r) => setTimeout(r, 0));
  signInAs('b@x.in');                // another account signs in before the answer arrives
  release();
  expect((await inFlight).data.data).toBe('for:a@x.in'); // the original caller still gets it
  reply = () => ({ data: okBody('for:b@x.in') });
  const res = await api.get('/survey/daily-submissions-count');
  expect(res.data.data).toBe('for:b@x.in');
  expect(calls).toHaveLength(2);
});

it('does not cache a response that was in flight when the cache was cleared (login/logout)', async () => {
  signInAs('a@x.in');
  let release;
  reply = () => new Promise((resolve) => { release = () => resolve({ data: okBody('stale') }); });
  const inFlight = api.get('/x');
  await new Promise((r) => setTimeout(r, 0));
  clearApiCache();
  release();
  await inFlight;
  expect(_apiCacheSize()).toBe(0);
});

it('caches only semantic successes', async () => {
  signInAs('a@x.in');
  reply = () => ({ data: { success: false, statusCode: 500, message: 'boom' } });
  await api.get('/err');
  reply = () => ({ data: { success: true, statusCode: 404, message: 'not found' } });
  await api.get('/err');
  reply = () => ({ data: okBody('fine') });
  await api.get('/err');
  await api.get('/err');
  expect(calls).toEqual(['/err', '/err', '/err']);
});

it('honours noCache and invalidation by url pattern', async () => {
  signInAs('a@x.in');
  await api.get('/form-location/HOUSE_HOLD');
  await api.get('/form-location/HOUSE_HOLD', { noCache: true });
  clearApiCache('/form-location/HOUSE_HOLD');
  await api.get('/form-location/HOUSE_HOLD');
  expect(calls).toHaveLength(3);
});
