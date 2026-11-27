import { addFormSchemaParam } from './formSchemaParam';
import { FORM_SCHEMA_VERSIONS, formSchemaVersionFor } from '../constants/releaseInfo';

it('adds the schema version to survey submissions only', () => {
  expect(addFormSchemaParam({ method: 'post', url: '/form/household' }).params)
    .toEqual({ formSchemaVersion: FORM_SCHEMA_VERSIONS.household });
  expect(addFormSchemaParam({ method: 'get', url: '/form/household' }).params).toBeUndefined();
  expect(addFormSchemaParam({ method: 'post', url: '/form/households' }).params).toBeUndefined();
});

it('keeps the version a queued record was saved with', () => {
  const cfg = addFormSchemaParam({ method: 'post', url: '/form/routine', params: { clientSubmissionId: 'x', formSchemaVersion: 1 } });
  expect(cfg.params).toEqual({ clientSubmissionId: 'x', formSchemaVersion: 1 });
});

it('maps draft form types and urls to the same schema', () => {
  expect(formSchemaVersionFor('routinemonitoring')).toBe(formSchemaVersionFor('/form/routine'));
  expect(formSchemaVersionFor('concurrent')).toBe(formSchemaVersionFor('/form/biannual'));
  expect(formSchemaVersionFor('/auth/signin')).toBeNull();
});
