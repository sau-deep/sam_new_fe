// Flow test for the Concurrent (Bi-Annual) page, short path (caregiver not
// available): the request carries the primary-caregiver Other detail in its own
// key, the C5 Child ID shown in the form, and the selected visit date; Retry
// re-sends the same request with the same submission id; a confirmed submit
// clears the autosave draft and returns to /surveys.
/* eslint-disable testing-library/no-render-in-setup, testing-library/no-unnecessary-act --
   this file drives the page with react-dom and act() directly; Testing Library is not used. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';

import BiAnnual from '../BiAnnual';
import apiService from '../../../services/api';
import { deleteFormDraft, saveOfflineForm } from 'utils/indexDB';

const mockNavigate = jest.fn();
let mockDraft = null;
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => mockNavigate }));
jest.mock('../../../services/api', () => ({ __esModule: true, default: { post: jest.fn(), get: jest.fn() } }));
jest.mock('../../../services/BiAnnualPDFService', () => ({ generateQuestionnairePDF: () => {} }));
// CRA resets jest.fn implementations before each test, so fixed behaviour uses plain functions.
jest.mock('utils/indexDB', () => ({
  saveOfflineForm: jest.fn(),
  newClientId: () => 'cid-1',
  stableDraftKey: type => `${type}__tester`,
  saveFormDraft: () => Promise.resolve(true),
  getFormDraft: () => Promise.resolve(mockDraft),
  deleteFormDraft: jest.fn(),
  cleanupOldDrafts: () => Promise.resolve(0),
  getCurrentOwnerId: () => 'tester',
}));
jest.mock('utils/networkState', () => ({ __esModule: true, default: () => true }));
jest.mock('hooks/useFormLocations', () => ({ __esModule: true, default: () => null }));
jest.mock('../../../utils/dailySurveyCount', () => ({
  isSurveyorUser: () => false, incrementDailyCount: () => {}, syncAfterSubmission: () => Promise.resolve(),
}));
jest.mock('utils/locationUtils', () => ({
  captureSurveyLocation: () => Promise.resolve({ lat: 25.6, lng: 85.1, accuracy: 5, timestamp: '2026-11-28T10:00:00Z' }),
  surveyLocationMetadata: c => ({ locationAccuracyMeters: c?.accuracy ?? null, locationCapturedAt: c?.timestamp ?? null }),
}));
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
      getDistrictOptionsByStateName: () => [district],
      getBlockOptionsByDistrictName: () => [block],
      getVillageOptionsByBlockName: () => [village],
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
const pick = (name, value) => container.querySelector(`input[name="${name}"][value="${value}"]`).click();
const buttonWithText = re => [...document.body.querySelectorAll('button')].find(b => re.test(b.textContent));

async function step(fn, ms = 20) {
  await act(async () => { fn(); await sleep(ms); });
}

async function fillGeneralInformation() {
  await step(() => type('visitDate', '2026-11-03'));
  await step(() => type('state', 'Bihar'));
  await step(() => type('district', 'Patna'));
  await step(() => pick('placeOfResidence', 'Rural'));
  await step(() => type('block', 'Danapur'));
  await step(() => type('village', 'Village 345'));
  await step(() => type('clusterCode', '3'));
  await step(() => type('structureCode', '01'));
  await step(() => type('householdNumber', '9'));
  await step(() => pick('hhHeadReligion', 'Hindu'));
  await step(() => pick('hhHeadCaste', 'OBC'));
  await step(() => pick('primaryCaregiver', 'Other'));
  await step(() => type('primaryCaregiver_other', '  Grandmother  '));
  await step(() => pick('careGiverInterview', 'No'));
}

beforeAll(() => {
  window.scrollTo = () => {};
  window.confirm = () => false;
  Element.prototype.scrollIntoView = () => {};
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => jest.restoreAllMocks());

beforeEach(async () => {
  mockDraft = null;
  window.confirm = () => false;
  mockNavigate.mockReset();
  apiService.post.mockReset();
  deleteFormDraft.mockReset();
  saveOfflineForm.mockReset();
  deleteFormDraft.mockResolvedValue(true);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  const show = element => root.render(element);
  await act(async () => { show(<MemoryRouter><BiAnnual /></MemoryRouter>); await sleep(30); });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  document.body.innerHTML = '';
});

it('shows the C5 Child ID and sends it with the Other detail and the selected visit date', async () => {
  apiService.post.mockResolvedValue({ success: true, statusCode: 200 });
  await fillGeneralInformation();
  const expectedId = '028-0123-345-03-01-009'; // village 345 is longer than 2: separated format (C5)
  expect(container.querySelector('input[name="childId"]').value).toBe(expectedId);

  await step(() => container.querySelector('button[type="submit"]').click(), 60);
  expect(apiService.post).toHaveBeenCalledTimes(1);
  const [url, request, config] = apiService.post.mock.calls[0];
  expect(url).toBe('/form/biannual');
  expect(config).toEqual({ params: { clientSubmissionId: 'cid-1' } });
  expect(request).toMatchObject({
    visitDate: '2026-11-03',
    childId: expectedId,
    primaryCaregiver: 'Other',
    primaryCaregiverOtherText: 'Grandmother',
    caregiversexOtherText: null,
    childSexOtherText: null,
    reasonNotAssessingOtherText: null,
    latitude: '25.6',
    longitude: '85.1',
  });
  expect(request).not.toHaveProperty('primaryCaregiver_other');

  expect(deleteFormDraft).toHaveBeenCalledWith('biannual__tester');
  await act(async () => { await sleep(1100); });
  expect(mockNavigate).toHaveBeenCalledWith('/surveys', { replace: true });
});

it('blocks submission until the Other detail is filled', async () => {
  await fillGeneralInformation();
  await step(() => type('primaryCaregiver_other', '   '));
  await step(() => container.querySelector('button[type="submit"]').click(), 60);
  expect(apiService.post).not.toHaveBeenCalled();
  expect(container.textContent).toContain('Please specify the other answer');
});

it('Retry re-sends the same request with the same submission id', async () => {
  apiService.post.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce({ success: true, statusCode: 200 });
  await fillGeneralInformation();
  await step(() => container.querySelector('button[type="submit"]').click(), 60);
  expect(deleteFormDraft).not.toHaveBeenCalled(); // failed: the draft stays
  await step(() => buttonWithText(/^Retry$/).click(), 60);
  expect(apiService.post).toHaveBeenCalledTimes(2);
  expect(apiService.post.mock.calls[1]).toEqual(apiService.post.mock.calls[0]);
  expect(deleteFormDraft).toHaveBeenCalledTimes(1);
  await act(async () => { await sleep(1100); });
  expect(mockNavigate).toHaveBeenCalledWith('/surveys', { replace: true });
});

it('Save Offline after a failed send queues the attempted request byte-identical under the same id (A08)', async () => {
  apiService.post.mockRejectedValue(new Error('timeout of 30000ms exceeded'));
  saveOfflineForm.mockResolvedValue(true);
  await fillGeneralInformation();
  await step(() => container.querySelector('button[type="submit"]').click(), 60);
  const [, sent, config] = apiService.post.mock.calls[0];
  await step(() => buttonWithText(/^Save Offline$/).click(), 60);
  expect(saveOfflineForm).toHaveBeenCalledTimes(1);
  const [queued] = saveOfflineForm.mock.calls[0];
  expect(queued).toEqual({ url: '/form/biannual', data: sent, clientSubmissionId: config.params.clientSubmissionId });
  expect(queued.data).toBe(sent);
  expect(queued.data.responseMode).toBe('online');
  expect(deleteFormDraft).toHaveBeenCalledWith('biannual__tester'); // queued: draft no longer needed
});

it('a restored draft with a hidden "Other" and no detail still submits; the hidden answers are not sent', async () => {
  // Draft: caregiver not interviewed, but earlier caregiver-step answers chose Other
  // without a detail, and GMT1.1 = Other although GMT1 was switched back to Yes.
  await act(async () => root.unmount());
  mockDraft = {
    ownerId: 'tester',
    lastModified: Date.now(),
    formData: {
      visitDate: '2026-11-02', state: 'Bihar', stateCode: '10', district: 'Patna', districtCode: '028',
      placeOfResidence: 'Rural', block: 'Danapur', blockCode: '0123', village: 'Village 345', villageCode: '345',
      clusterCode: '3', structureCode: '01', householdNumber: '9', hhHeadReligion: 'Hindu', hhHeadCaste: 'OBC',
      primaryCaregiver: 'Mother', primaryCaregiver_other: '', careGiverInterview: 'No',
      caregiversex: 'Other', caregiversex_other: '',
      weightLastMonthAww: 'Yes', weightNotMeasuredReason: 'Other', weightNotMeasuredReason_other: '',
    },
  };
  window.confirm = () => true; // restore it
  apiService.post.mockResolvedValue({ success: true, statusCode: 200 });
  root = createRoot(container);
  const show = element => root.render(element);
  await act(async () => { show(<MemoryRouter><BiAnnual /></MemoryRouter>); await sleep(80); });

  // A06: the restored location selection gives the Child ID preview again.
  expect(container.querySelector('input[name="childId"]').value).toBe('028-0123-345-03-01-009');
  await step(() => container.querySelector('button[type="submit"]').click(), 80);
  expect(apiService.post).toHaveBeenCalledTimes(1);
  const request = apiService.post.mock.calls[0][1];
  expect(request).toMatchObject({
    visitDate: '2026-11-02',
    caregiversex: '', caregiversexOtherText: null,
    weightNotMeasuredReason: '', weightNotMeasuredReasonOtherText: null,
    primaryCaregiver: 'Mother', primaryCaregiverOtherText: null,
  });
});
