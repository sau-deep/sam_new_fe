import * as XLSX from 'xlsx';
import { buildChildListWorkbook, SAMPLE_NOTE } from './HouseholdChildList';

jest.mock('../../services/axiosInstance', () => ({ __esModule: true, default: { post: jest.fn(), get: jest.fn() } }));
jest.mock('../../hooks/useFormLocations', () => ({ __esModule: true, default: () => ({}) }));
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ isStateAdmin: () => false, user: null }) }));

it('labels the Child List workbook as a sample and adds the captured address', () => {
  const wb = buildChildListWorkbook(
    [{ childId: '0050123450102003', locationHousehold: 'Ward 4, Patna', villageCode: '05' }, { childId: null }],
    { state: 'Bihar', district: 'Patna', block: 'Danapur' },
  );
  expect(wb.SheetNames).toEqual(['Household Child List', 'About this sample']);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['Household Child List'], { header: 1 });
  expect(rows[0][0]).toBe('Child ID');
  expect(rows[0][rows[0].length - 1]).toBe('Address');
  expect(rows[1][rows[0].length - 1]).toBe('Ward 4, Patna');
  expect(rows[1][0]).toBe('0050123450102003');
  expect(rows[2][0]).toBe('—'); // blank Child ID is shown as missing, never generated
  const about = XLSX.utils.sheet_to_json(wb.Sheets['About this sample'], { header: 1 });
  expect(about[0][0]).toMatch(/SAMPLE/);
  expect(about[1][0]).toBe(SAMPLE_NOTE);
  expect(SAMPLE_NOTE).toMatch(/at most 25 records/);
});
