import { getCurrentOwnerId, loginIdFromSignIn } from './currentOwner';

const token = claims => `x.${btoa(JSON.stringify(claims)).replace(/=+$/, '')}.y`;

describe('current owner = login id', () => {
  beforeEach(() => localStorage.clear());
  afterAll(() => localStorage.clear());

  it('uses the stored login id, never the display name', () => {
    localStorage.setItem('iegUsername', 'E2E Surveyor');
    expect(getCurrentOwnerId()).toBeNull();
    localStorage.setItem('samOwnerId', 'e2e-surv@test.local');
    expect(getCurrentOwnerId()).toBe('e2e-surv@test.local');
  });

  it('falls back to the JWT subject for sessions from before the owner key', () => {
    localStorage.setItem('iegAccessToken', token({ sub: 'surveyor9@x.in', exp: 9999999999 }));
    expect(getCurrentOwnerId()).toBe('surveyor9@x.in');
  });

  it('reads the login id from a sign-in response (explicit field, else token subject)', () => {
    expect(loginIdFromSignIn({ loginId: ' a@b.in ', accessToken: token({ sub: 'other' }) })).toBe('a@b.in');
    expect(loginIdFromSignIn({ username: 'Display Name', accessToken: token({ sub: 'c@d.in' }) })).toBe('c@d.in');
    expect(loginIdFromSignIn({ username: 'Display Name' })).toBeNull();
  });
});
