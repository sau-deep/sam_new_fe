// Smoke test: the three survey pages wired to the payload builders import and
// render (catches undefined identifiers and module-level mistakes that eslint
// cannot). Network, PDF and map dependencies are stubbed.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';

import BiAnnual from '../BiAnnual';
import Followup from '../Followup';
import HouseHold from '../HouseHold';

jest.mock('@capacitor/geolocation', () => ({ Geolocation: { watchPosition: jest.fn(), clearWatch: jest.fn() } }));
jest.mock('components/ui/StreetMap', () => () => null);
jest.mock('jspdf', () => function JsPDF() {});
jest.mock('../../../services/BiAnnualPDFService', () => ({ generateQuestionnairePDF: () => {} }));
jest.mock('axios', () => {
  const instance = {
    get: jest.fn(() => Promise.reject(new Error('offline'))),
    post: jest.fn(() => Promise.reject(new Error('offline'))),
    put: jest.fn(), patch: jest.fn(), delete: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    defaults: { headers: { common: {} } },
  };
  const axios = { ...instance, create: jest.fn(() => instance), isCancel: () => false };
  return { __esModule: true, default: axios, ...axios };
});

global.IS_REACT_ACT_ENVIRONMENT = true;

async function mountPage(Page) {
  const div = document.createElement('div');
  document.body.appendChild(div);
  const root = createRoot(div);
  const show = (element) => root.render(element);
  await act(async () => {
    show(<MemoryRouter><Page /></MemoryRouter>);
  });
  await act(async () => { await new Promise(r => setTimeout(r, 50)); });
  const html = div.innerHTML;
  await act(async () => root.unmount());
  div.remove();
  return html;
}

beforeAll(() => {
  window.confirm = () => false; // decline any draft-restore prompt
  window.scrollTo = () => {};
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => jest.restoreAllMocks());

it('renders the Concurrent form with the Child ID preview', async () => {
  const html = await mountPage(BiAnnual);
  expect(html).toContain('name="childId"');
  expect(html).toContain('Filled in from the location and household codes');
});

it('renders the Follow-Up form', async () => {
  expect(await mountPage(Followup)).toContain('name="nameOfRespondent"');
});

it('renders the Household form', async () => {
  expect(await mountPage(HouseHold)).toContain('name="nameParticipant"');
});
