import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { buildRoutineDraftValues, splitRoutineDraft, draftFingerprint, RMC_DRAFT_KEY } from './routineDraft';
import { useSectionDraft, useDraftField, restoreValue } from './sectionDraft';
import { describeFieldErrors, locateErrorControl } from './fieldErrorTargets';

describe('routine draft snapshot', () => {
  it('round-trips top-level values, section answers and step', () => {
    const values = { activityToObserve: 'Household/caregiver interaction', householdSection: 'section10', section10: true };
    const sections = { section10: { formValues: { otherRegularFood: 'Khichdi' }, adviceReceived: ['immunization'] } };
    const stored = JSON.parse(JSON.stringify(buildRoutineDraftValues(values, { sections, step: 1 })));
    expect(stored[RMC_DRAFT_KEY].sections.section10.formValues.otherRegularFood).toBe('Khichdi');
    const back = splitRoutineDraft(stored);
    expect(back.values).toEqual(values);
    expect(back.sections).toEqual(sections);
    expect(back.step).toBe(1);
  });

  it('reads drafts saved before section answers were stored', () => {
    expect(splitRoutineDraft({ village: 'V1' })).toEqual({ values: { village: 'V1' }, sections: {}, step: 0 });
  });

  it('fingerprint changes when a section answer changes', () => {
    const v = { village: 'V1' };
    expect(draftFingerprint(v, { cbe: { themeOfCbe: 'A' } })).not.toBe(draftFingerprint(v, { cbe: { themeOfCbe: 'B' } }));
  });

  it('fingerprint ignores app-filled network state, so a retry after going offline keeps its id', () => {
    const online = { village: 'V1', responseMode: 'ONLINE', location: 'Agra' };
    const offline = { village: 'V1', responseMode: 'OFFLINE', location: 'Location not available in offline mode' };
    expect(draftFingerprint(online, {})).toBe(draftFingerprint(offline, {}));
  });
});

describe('restoreValue', () => {
  it('only restores values of the same shape', () => {
    expect(restoreValue(['a'], [])).toEqual(['a']);
    expect(restoreValue('a', [])).toEqual([]);
    expect(restoreValue({ b: 2 }, { a: '', b: '' })).toEqual({ a: '', b: 2 });
    expect(restoreValue(null, '')).toBe('');
    expect(restoreValue(undefined, 'x')).toBe('x');
  });
});

describe('section draft hooks', () => {
  let container;
  let root;
  // Plain wrappers so the React root calls are not mistaken for Testing Library utils.
  const show = (element) => { root.render(element); };
  const teardown = () => { root.unmount(); };
  beforeAll(() => { global.IS_REACT_ACT_ENVIRONMENT = true; });
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => { teardown(); });
    container.remove();
  });

  const Section = React.forwardRef((props, ref) => {
    const draft = useSectionDraft(ref, props, { triggerValidation: () => true });
    const [theme, setTheme] = useDraftField(draft, 'themeOfCbe', '');
    const [aids, setAids] = useDraftField(draft, 'counsellingAidsUsed', []);
    return (
      <div id="cbeForm">
        <input name="themeOfCbe" value={theme} onChange={(e) => setTheme(e.target.value)} />
        <button type="button" onClick={() => setAids([...aids, 'mcpCard'])}>add</button>
      </div>
    );
  });

  it('reports answers to the page and restores them on remount', () => {
    const reports = [];
    const onDraftChange = (id, values, dirty) => reports.push({ id, values, dirty });
    const ref = React.createRef();

    act(() => { show(<Section ref={ref} sectionId="cbe" onDraftChange={onDraftChange} />); });
    expect(reports[0]).toEqual({ id: 'cbe', values: { themeOfCbe: '', counsellingAidsUsed: [] }, dirty: false });

    act(() => { container.querySelector('button').click(); });
    const last = reports[reports.length - 1];
    expect(last.values.counsellingAidsUsed).toEqual(['mcpCard']);
    expect(last.dirty).toBe(true);
    expect(ref.current.getDraftState()).toEqual({ themeOfCbe: '', counsellingAidsUsed: ['mcpCard'] });
    expect(ref.current.triggerValidation()).toBe(true);

    // Hard reload: a new instance mounted with the saved draft shows the same answers.
    act(() => {
      show(<Section key="restored" ref={ref} sectionId="cbe" initialDraft={{ themeOfCbe: 'Others - Fair', counsellingAidsUsed: ['mcpCard'] }} onDraftChange={onDraftChange} />);
    });
    expect(container.querySelector('input[name="themeOfCbe"]').value).toBe('Others - Fair');
    expect(ref.current.getDraftState().counsellingAidsUsed).toEqual(['mcpCard']);
    expect(reports[reports.length - 1].dirty).toBe(true);
  });

  it('tells the page when a section is removed', () => {
    const reports = [];
    act(() => { show(<Section sectionId="section8" onDraftChange={(id, v) => reports.push([id, v])} />); });
    act(() => { show(<div />); });
    expect(reports[reports.length - 1]).toEqual(['section8', undefined]);
  });
});

describe('server field errors', () => {
  it('maps request key paths to section controls and top-level fields', () => {
    document.body.innerHTML = `
      <input name="village" />
      <div id="cbeForm"><input name="themeOfCbeOther" /></div>
      <div id="skillAssessmentForm"><input name="lastMeasurementDate" /></div>`;
    const described = describeFieldErrors({
      village: 'Village is required',
      'cbeData.themeOfCbe': 'Too long',
      'aganwadiData.dateChildMeasured': 'Invalid date',
    });
    expect(described[0].topLevelField).toBe('village');
    expect(locateErrorControl(described[0]).getAttribute('name')).toBe('village');
    expect(locateErrorControl(described[1]).getAttribute('name')).toBe('themeOfCbeOther');
    expect(locateErrorControl(described[2]).getAttribute('name')).toBe('lastMeasurementDate');
    document.body.innerHTML = '';
  });
});
