import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { message } from 'antd';
import api, { clearApiCache } from '../../services/axiosInstance';
import FormLocationManagement from './FormLocationManagement';

jest.mock('../../services/axiosInstance', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  clearApiCache: jest.fn(),
}));

const res = (data, status = 200) => ({ data, status, config: {}, headers: {} });
const ROWS = [
  { id: 1, state: 'Bihar', district: 'Patna', block: 'Danapur', blockCode: '0123', village: 'Rampur', villageCode: '05', entryType: 'VILLAGE', isActive: true },
  { id: 2, state: 'Bihar', district: 'Patna', block: 'Danapur', blockCode: '0123', village: 'Sitapur', villageCode: '345', entryType: 'VILLAGE', isActive: true },
];

let container;
let root;
let serverRows;

const realConsoleError = console.error;
beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  // antd deprecation notices for props this page already used are not what we test.
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    if (String(args[0]).includes('[antd:')) return;
    realConsoleError(...args);
  });
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});

beforeEach(() => {
  jest.clearAllMocks();
  serverRows = ROWS.map((r) => ({ ...r }));
  api.get.mockImplementation(async (url) => (url.includes('location-data')
    ? res({ success: true, statusCode: 200, data: { districts: [], blocks: [], villages: [] } })
    : res({ success: true, statusCode: 200, data: serverRows.map((r) => ({ ...r })) })));
  jest.spyOn(message, 'success').mockImplementation(() => {});
  jest.spyOn(message, 'error').mockImplementation(() => {});
  jest.spyOn(message, 'warning').mockImplementation(() => {});
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

// Plain react-dom (this project has no Testing Library), so act() is needed.
const mountPage = async () => {
  // eslint-disable-next-line testing-library/no-unnecessary-act
  await act(async () => { root.render(<FormLocationManagement />); });
};

afterEach(async () => {
  // eslint-disable-next-line testing-library/no-unnecessary-act
  await act(async () => { root.unmount(); });
  container.remove();
  message.success.mockRestore();
  message.error.mockRestore();
  message.warning.mockRestore();
});

const switches = () => [...container.querySelectorAll('button[role="switch"]')];
const click = async (el) => { await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); };
const buttonByText = (text) => [...container.querySelectorAll('button')].find((b) => b.textContent.trim() === text);

it('does not report success when the body says the toggle failed (HTTP 200, statusCode 404)', async () => {
  await mountPage();
  expect(switches()).toHaveLength(2);
  api.patch.mockResolvedValueOnce(res({ success: false, statusCode: 404, message: 'Entry not found' }));
  await click(switches()[0]);
  expect(message.success).not.toHaveBeenCalled();
  expect(message.error).toHaveBeenCalledWith('Entry not found');
  expect(clearApiCache).not.toHaveBeenCalled();
  expect(switches()[0].getAttribute('aria-checked')).toBe('true');
});

it('reports success and invalidates the form cache only for a real success', async () => {
  await mountPage();
  api.patch.mockImplementationOnce(async () => {
    serverRows[0].isActive = false;
    return res({ success: true, statusCode: 200, data: { ...serverRows[0] } });
  });
  await click(switches()[0]);
  expect(message.success).toHaveBeenCalledWith('"Rampur" deactivated.');
  expect(clearApiCache).toHaveBeenCalledWith('/form-location/ROUTINE_MONITORING');
  expect(switches()[0].getAttribute('aria-checked')).toBe('false');
});

it('keeps successful rows on a partial bulk failure, lists the failed rows and re-reads the list', async () => {
  await mountPage();
  api.patch.mockImplementation(async (url) => {
    if (url.startsWith('/admin/form-location/1/')) {
      serverRows[0].isActive = false;
      return res({ success: true, statusCode: 200, data: { ...serverRows[0] } });
    }
    return res({ success: true, statusCode: 500, message: 'Error updating status: lock timeout' });
  });
  const getsBefore = api.get.mock.calls.length;
  await click(buttonByText('Deactivate All'));
  expect(message.success).not.toHaveBeenCalled();
  expect(message.warning).toHaveBeenCalledWith(expect.stringMatching(/^1 of 2 location\(s\) deactivated; 1 failed/));
  expect(api.get.mock.calls.length).toBeGreaterThan(getsBefore); // authoritative refresh
  expect(container.textContent).toContain('Sitapur');
  expect(container.textContent).toContain('Error updating status: lock timeout');
  const [first, second] = switches();
  expect(first.getAttribute('aria-checked')).toBe('false'); // success kept
  expect(second.getAttribute('aria-checked')).toBe('true'); // failure shown as it really is
});

it('does not report a removal that the body says failed, and re-reads the list', async () => {
  await mountPage();
  api.delete.mockResolvedValueOnce(res({ success: false, statusCode: 400, message: 'Entry is in use' }));
  const removeButtons = [...container.querySelectorAll('button')].filter((b) => b.textContent.trim() === 'Remove');
  await click(removeButtons[0]);
  const confirm = [...document.body.querySelectorAll('.ant-popconfirm button')].find((b) => b.textContent.trim() === 'Remove');
  const getsBefore = api.get.mock.calls.length;
  await click(confirm);
  expect(api.delete).toHaveBeenCalledWith('/admin/form-location/ROUTINE_MONITORING/0123?villageCode=05');
  expect(message.success).not.toHaveBeenCalled();
  expect(message.error).toHaveBeenCalledWith('Entry is in use');
  expect(clearApiCache).not.toHaveBeenCalled();
  expect(api.get.mock.calls.length).toBeGreaterThan(getsBefore);
});
