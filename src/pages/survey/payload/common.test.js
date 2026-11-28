import * as Yup from 'yup';
import {
  SURVEY_LIST_ROUTE, collectYupErrors, detailOrNull, mapRequestErrors, maxCharsRule,
  otherDetailRule, requiredTextRule, sendSurvey, yupErrorMap,
} from './common';

describe('detailOrNull', () => {
  it('keeps the trimmed detail only for the Other choice', () => {
    expect(detailOrNull('Other', '  grandmother ')).toBe('grandmother');
    expect(detailOrNull('Mother', 'grandmother')).toBeNull();
    expect(detailOrNull('Other', '   ')).toBeNull();
    expect(detailOrNull('Others', 'x', 'Others')).toBe('x');
  });
});

describe('Yup rule builders', () => {
  const schema = Yup.object({
    name: requiredTextRule(5, 'Name'),
    note: maxCharsRule(3, 'Note'),
    choice: Yup.string(),
    choice_other: otherDetailRule({ mainField: 'choice', max: 4 }),
  });
  const errorsFor = async values => collectYupErrors([schema], values);

  it('rejects whitespace-only required text and counts code points', async () => {
    expect(await errorsFor({ name: '   ' })).toHaveProperty('name', 'This is a required field');
    // Hindi: नमस् = न म स ् → 4 code points, fits 5.
    expect(await errorsFor({ name: 'नमस्' })).toEqual({});
    // 5 emoji = 5 code points (10 UTF-16 units) still fits 5.
    expect(await errorsFor({ name: '😀😀😀😀😀' })).toEqual({});
    expect(await errorsFor({ name: 'नमस्ते' })).toHaveProperty('name', 'Name can be at most 5 characters (currently 6).');
  });

  it('states the allowed length in the message', async () => {
    const errs = await errorsFor({ name: 'ABCDEF', note: 'abcd' });
    expect(errs.name).toBe('Name can be at most 5 characters (currently 6).');
    expect(errs.note).toBe('Note can be at most 3 characters (currently 4).');
  });

  it('requires the Other detail only when Other is chosen', async () => {
    expect(await errorsFor({ name: 'A', choice: 'Other', choice_other: ' ' })).toHaveProperty('choice_other');
    expect(await errorsFor({ name: 'A', choice: 'Yes', choice_other: '' })).toEqual({});
    expect(await errorsFor({ name: 'A', choice: 'Other', choice_other: 'abcde' })).toHaveProperty('choice_other',
      'Other detail can be at most 4 characters (currently 5).');
    expect(await errorsFor({ name: 'A', choice: 'Yes', choice_other: 'abcdefgh' })).toEqual({});
  });
});

describe('yupErrorMap / mapRequestErrors', () => {
  it('keeps the first message per path', () => {
    const err = { inner: [{ path: 'a', message: 'one' }, { path: 'a', message: 'two' }, { path: 'b', message: 'three' }] };
    expect(yupErrorMap(err)).toEqual({ a: 'one', b: 'three' });
  });

  it('maps request keys to form fields present in the values', () => {
    const { fields, unmatched } = mapRequestErrors(
      { xOtherText: 'too long', childId: 'bad', name: 'required' },
      key => (key === 'xOtherText' ? 'x_other' : key),
      { x_other: '', name: '' },
    );
    expect(fields).toEqual({ x_other: 'too long', name: 'required' });
    expect(unmatched).toEqual({ childId: 'bad' });
  });
});

describe('sendSurvey', () => {
  it('uses the shared success rule and passes the submission id', async () => {
    const post = jest.fn().mockResolvedValue({ success: true, statusCode: 200 });
    const out = await sendSurvey(post, '/form/x', { a: 1 }, 'id-1');
    expect(out.status).toBe('ok');
    expect(post).toHaveBeenCalledWith('/form/x', { a: 1 }, { params: { clientSubmissionId: 'id-1' } });
  });

  it('treats success=true with an error status as a failure', async () => {
    const post = jest.fn().mockResolvedValue({ success: true, statusCode: 500, message: 'boom' });
    expect(await sendSurvey(post, '/form/x', {})).toMatchObject({ status: 'failed', message: 'boom' });
  });

  it('recognises a C1 validation failure with field errors', async () => {
    const body = { success: false, statusCode: 400, message: 'Child name too long', data: { fieldErrors: { childName: 'too long' } } };
    const out = await sendSurvey(jest.fn().mockResolvedValue(body), '/form/x', {});
    expect(out).toMatchObject({ status: 'invalid', message: 'Child name too long', fieldErrors: { childName: 'too long' } });
  });

  it('classifies thrown errors', async () => {
    const auth = await sendSurvey(jest.fn().mockRejectedValue({ response: { status: 401 } }), '/form/x', {});
    expect(auth.status).toBe('auth');
    const network = await sendSurvey(jest.fn().mockRejectedValue(new Error('Network Error')), '/form/x', {});
    expect(network).toMatchObject({ status: 'failed', message: 'Network Error' });
    const invalid = await sendSurvey(jest.fn().mockRejectedValue({ response: { status: 400, data: { message: 'bad' } } }), '/form/x', {});
    expect(invalid).toMatchObject({ status: 'invalid', message: 'bad' });
  });
});

it('returns to the survey list route', () => {
  expect(SURVEY_LIST_ROUTE).toBe('/surveys');
});

it('defaults the visit date to the device calendar day, not UTC', () => {
  const { localIsoDate } = require('./common');
  // 01:30 local on 5 Jan 2026 is still 4 Jan in UTC for timezones ahead of UTC.
  expect(localIsoDate(new Date(2026, 0, 5, 1, 30))).toBe('2026-01-05');
  expect(localIsoDate(new Date(2026, 10, 28, 23, 59))).toBe('2026-11-28');
});
