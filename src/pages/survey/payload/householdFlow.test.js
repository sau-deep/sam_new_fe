// Flow test for the Household page (audit W1 acceptance on the smallest form):
// one built request is posted with the selected date/time and captured address,
// a server validation failure keeps the answers and marks the field, a network
// failure lets the error dialog queue the SAME request, and a storage failure
// keeps the form on screen.
/* eslint-disable testing-library/no-render-in-setup, testing-library/no-unnecessary-act --
   this file drives the page with react-dom and act() directly; Testing Library is not used. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';

import HouseHold from '../HouseHold';
import apiService from '../../../services/api';
import { saveOfflineForm } from 'utils/indexDB';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => mockNavigate }));
jest.mock('../../../services/api', () => ({ __esModule: true, default: { post: jest.fn(), get: jest.fn() } }));
// CRA resets jest.fn implementations before each test, so fixed behaviour uses plain functions.
jest.mock('utils/indexDB', () => ({ saveOfflineForm: jest.fn(), newClientId: () => 'cid-1' }));
let mockOnline = true;
jest.mock('utils/networkState', () => ({ __esModule: true, default: () => mockOnline }));
jest.mock('hooks/useFormLocations', () => ({ __esModule: true, default: () => null }));
jest.mock('../../../utils/dailySurveyCount', () => ({
  isSurveyorUser: () => false, incrementDailyCount: () => {}, syncAfterSubmission: () => Promise.resolve(),
}));
jest.mock('utils/locationUtils', () => ({
  captureSurveyLocation: () => Promise.resolve({ lat: 25.6, lng: 85.1, accuracy: 5, timestamp: '2026-11-28T10:00:00Z' }),
  surveyLocationMetadata: c => ({ locationAccuracyMeters: c?.accuracy ?? null, locationCapturedAt: c?.timestamp ?? null }),
}));
jest.mock('components/ui/StreetMap', () => {
  const ReactLib = require('react');
  return function StreetMapStub({ setAddressDetails }) {
    ReactLib.useEffect(() => { setAddressDetails({ display_name: 'Ward 4, Danapur, Patna' }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
  };
});
jest.mock('utils/formLocations', () => {
  const state = { text: 'Bihar', state_code: 10 };
  const district = { text: 'Patna', district_code: 28, state_code: 10 };
  const block = { text: 'Danapur', block_code: 123, district_code: 28, state_code: 10 };
  const village = { text: 'Village 345', village_code: '345', block_code: 123, district_code: 28, state_code: 10 };
  return {
    getFormLocationHelpers: () => ({
      getStateOptions: value => (value == null || value === 'Bihar' ? [state] : []),
      getDistrictOptions: () => [district],
      getBlockOptions: () => [block],
      getVillageOptions: () => [village],
    }),
  };
});

global.IS_REACT_ACT_ENVIRONMENT = true;

const sleep = ms => new Promise(r => setTimeout(r, ms));
let container;
let root;

function type(name, value) {
  const el = container.querySelector(`input[name="${name}"]`);
  if (!el) throw new Error(`no input ${name}`);
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function buttonWithText(re) {
  return [...document.body.querySelectorAll('button')].find(b => re.test(b.textContent));
}

async function step(fn, ms = 20) {
  await act(async () => { fn(); await sleep(ms); });
}

async function fillForm() {
  await step(() => type('nameParticipant', 'SITA'));
  await step(() => container.querySelector('input[name="verbalConsent"][value="Yes"]').click());
  await step(() => type('date', '2026-11-10'));
  await step(() => type('time', '09:45'));
  await step(() => buttonWithText(/^Next$/).click(), 50);
  // Step 2: MUI Selects accept a change on their hidden native input.
  await step(() => type('state', 'Bihar'));
  await step(() => type('district', 'Patna'));
  await step(() => type('block', 'Danapur'));
  await step(() => type('village', 'Village 345'));
  await step(() => type('clusterNumber', '3'));
  await step(() => type('structureCode', '01'));
  await step(() => type('householdNumber', '12'));
  await step(() => type('mobileNumber', '98765 43210')); // pasted with a space
  await step(() => type('headOfHousehold', 'RAM'));
  await step(() => type('numberOfChildren', '2'));
  await step(() => type('childrenStayingHh', '2'));
}

async function submit(ms = 50) {
  await step(() => container.querySelector('button[type="submit"]').click(), ms);
}

beforeAll(() => {
  window.scrollTo = () => {};
  Element.prototype.scrollIntoView = () => {};
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => jest.restoreAllMocks());

beforeEach(async () => {
  mockOnline = true;
  mockNavigate.mockReset();
  apiService.post.mockReset();
  saveOfflineForm.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  const show = element => root.render(element);
  await act(async () => { show(<MemoryRouter><HouseHold /></MemoryRouter>); await sleep(20); });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  document.body.innerHTML = '';
});

it('posts one built request with the selected date/time and captured address, then returns to /surveys', async () => {
  apiService.post.mockResolvedValue({ success: true, statusCode: 200 });
  await fillForm();
  await submit();
  expect(apiService.post).toHaveBeenCalledTimes(1);
  const [url, request, config] = apiService.post.mock.calls[0];
  expect(url).toBe('/form/household');
  expect(config).toEqual({ params: { clientSubmissionId: 'cid-1' } });
  expect(request).toMatchObject({
    date: '2026-11-10', time: '09:45',
    locationHousehold: 'Ward 4, Danapur, Patna',
    villageCode: '345', mobileNumber: '9876543210', stateCode: '10', districtCode: '28', blockCode: '123',
    latitude: 25.6, longitude: 85.1, locationAccuracyMeters: 5,
  });
  await act(async () => { await sleep(1100); });
  expect(mockNavigate).toHaveBeenCalledWith('/surveys', { replace: true });
});

it('keeps the answers and marks the field when the server rejects the data', async () => {
  apiService.post.mockResolvedValue({
    success: false, statusCode: 400, message: 'Head of household name is too long',
    data: { fieldErrors: { headOfHousehold: 'Head of household name can be at most 255 characters' } },
  });
  await fillForm();
  await submit();
  expect(container.textContent).toContain('Head of household name can be at most 255 characters');
  expect(document.body.textContent).toContain('Head of household name is too long');
  expect(container.querySelector('input[name="headOfHousehold"]').value).toBe('RAM');
  await act(async () => { await sleep(1100); });
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(saveOfflineForm).not.toHaveBeenCalled();
});

it('rejects a whitespace-only head of household before sending', async () => {
  await fillForm();
  await step(() => type('headOfHousehold', '   '));
  await submit();
  expect(apiService.post).not.toHaveBeenCalled();
  expect(container.textContent).toContain('This is a required field');
});

it('after a sent attempt fails, Save Offline queues the byte-identical request under the same id (A08)', async () => {
  apiService.post.mockRejectedValue(new Error('Network Error'));
  saveOfflineForm.mockResolvedValue(true);
  await fillForm();
  await submit();
  const sent = apiService.post.mock.calls[0][1];
  const dialogSave = buttonWithText(/Save Offline/i);
  expect(dialogSave).toBeTruthy();
  await step(() => dialogSave.click(), 50);
  const [queued] = saveOfflineForm.mock.calls[0];
  // Same data object as the POST (responseMode untouched) and the same submission id,
  // so replaying a request the server already saved returns the original result.
  expect(queued).toEqual({ url: '/form/household', data: sent, clientSubmissionId: 'cid-1' });
  expect(queued.data).toBe(sent);
  expect(queued.data.responseMode).toBe('online');
  await act(async () => { await sleep(3100); });
  expect(mockNavigate).toHaveBeenCalledWith('/surveys', { replace: true });
});

it('keeps the form on screen when the offline save fails', async () => {
  apiService.post.mockRejectedValue(new Error('Network Error'));
  saveOfflineForm.mockRejectedValue(new Error('quota'));
  await fillForm();
  await submit();
  await step(() => buttonWithText(/Save Offline/i).click(), 50);
  expect(saveOfflineForm).toHaveBeenCalledTimes(1);
  expect(container.querySelector('input[name="headOfHousehold"]').value).toBe('RAM');
  await act(async () => { await sleep(3100); });
  expect(mockNavigate).not.toHaveBeenCalled();
});

it('a direct offline save (no online attempt) is queued as offline with a fresh id', async () => {
  mockOnline = false;
  saveOfflineForm.mockResolvedValue(true);
  await fillForm();
  await submit();
  expect(apiService.post).not.toHaveBeenCalled();
  expect(saveOfflineForm).toHaveBeenCalledTimes(1);
  const [queued] = saveOfflineForm.mock.calls[0];
  expect(queued).not.toHaveProperty('clientSubmissionId');
  expect(queued.url).toBe('/form/household');
  expect(queued.data).toMatchObject({ responseMode: 'offline', date: '2026-11-10', time: '09:45', mobileNumber: '9876543210' });
  await act(async () => { await sleep(3100); });
  expect(mockNavigate).toHaveBeenCalledWith('/surveys', { replace: true });
});
