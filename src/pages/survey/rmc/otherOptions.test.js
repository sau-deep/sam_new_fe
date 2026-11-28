import {
  parseMultiSelect,
  serializeMultiSelect,
  parseSingleChoice,
  serializeSingleChoice,
  findOtherOptionKey,
  isBareOtherToken,
} from './otherOptions';

const BENEFICIARY = {
  options: ['pregnantWomen', 'lactatingWomen', 'elderWomenInLaws', 'otherMaleMembers', 'other'],
  displayNames: {
    pregnantWomen: 'Pregnant women',
    lactatingWomen: 'Lactating women',
    elderWomenInLaws: 'Elder women / in-laws',
    otherMaleMembers: 'Other male members',
    other: 'Others',
  },
};

describe('findOtherOptionKey', () => {
  it('matches the Other option exactly, not keys that merely contain "other"', () => {
    expect(findOtherOptionKey(BENEFICIARY.options)).toBe('other');
    expect(findOtherOptionKey(['otherMaleMembers', 'anotherThing'])).toBeNull();
    expect(findOtherOptionKey(['a', 'othersAdvice'])).toBe('othersAdvice');
  });
});

describe('parseMultiSelect', () => {
  it('keeps otherMaleMembers as a normal option (no includes("other") trap)', () => {
    const p = parseMultiSelect('pregnantWomen, otherMaleMembers', BENEFICIARY);
    expect(p.selected).toEqual(['pregnantWomen', 'otherMaleMembers']);
    expect(p.otherSelected).toBe(false);
  });

  it('keeps commas inside the Other text', () => {
    const p = parseMultiSelect('pregnantWomen, Others - grandfathers, uncles, and neighbours', BENEFICIARY);
    expect(p.selected).toEqual(['pregnantWomen']);
    expect(p.otherSelected).toBe(true);
    expect(p.otherText).toBe('grandfathers, uncles, and neighbours');
  });

  it('reads legacy rows where the Other entry is not last', () => {
    const p = parseMultiSelect('Others - grandfathers, uncles, lactatingWomen, otherMaleMembers', BENEFICIARY);
    expect(p.otherText).toBe('grandfathers, uncles');
    expect(p.selected).toEqual(['lactatingWomen', 'otherMaleMembers']);
  });

  it('a detail ends only at an exact stored option key, not at a display name or wording', () => {
    const opts = { options: ['immunization', 'hygieneSanitation', 'othersAdvice'], displayNames: { immunization: 'Immunization' } };
    expect(parseMultiSelect('hygieneSanitation, Others - visited, Immunization', opts).otherText).toBe('visited, Immunization');
    // Older click-order rows: an exact key after the detail is still a selection.
    const legacy = parseMultiSelect('Others - visited, immunization', opts);
    expect(legacy.otherText).toBe('visited');
    expect(legacy.selected).toEqual(['immunization']);
  });

  it('reads bare Other tokens and display names', () => {
    const p = parseMultiSelect('Pregnant women, others', BENEFICIARY);
    expect(p.selected).toEqual(['pregnantWomen']);
    expect(p.otherSelected).toBe(true);
    expect(p.otherText).toBe('');
  });

  it('reads a JSON array value', () => {
    const p = parseMultiSelect('["lactatingWomen","Others - x, y"]', BENEFICIARY);
    expect(p.selected).toEqual(['lactatingWomen']);
    expect(p.otherText).toBe('x, y');
  });

  it('keeps unknown saved tokens instead of dropping them', () => {
    const p = parseMultiSelect('pregnantWomen, retiredOption', BENEFICIARY);
    expect(p.extras).toEqual(['retiredOption']);
  });

  it('recognises "othersAdvice" as the Other option of Q10.25', () => {
    const p = parseMultiSelect('immunization, othersAdvice', { options: ['immunization', 'othersAdvice'] });
    expect(p.selected).toEqual(['immunization']);
    expect(p.otherSelected).toBe(true);
  });

  it('keeps the text exactly while it is being typed (trailing space, trailing comma)', () => {
    expect(parseMultiSelect('pregnantWomen, Others - hello ', BENEFICIARY).otherText).toBe('hello ');
    expect(parseMultiSelect('pregnantWomen, Others - hello,', BENEFICIARY).otherText).toBe('hello,');
  });
});

describe('serializeMultiSelect', () => {
  it('preserves the other selections when the Other text changes (A02)', () => {
    const parsed = parseMultiSelect('pregnantWomen, otherMaleMembers, other', BENEFICIARY);
    const out = serializeMultiSelect({ ...parsed, otherText: 'grandfathers, uncles' }, BENEFICIARY);
    expect(out).toBe('pregnantWomen, otherMaleMembers, Others - grandfathers, uncles');
  });

  it('round-trips through parse with commas intact', () => {
    const value = serializeMultiSelect({ selected: ['lactatingWomen'], otherSelected: true, otherText: 'a, b, c' }, BENEFICIARY);
    const back = parseMultiSelect(value, BENEFICIARY);
    expect(back.selected).toEqual(['lactatingWomen']);
    expect(back.otherText).toBe('a, b, c');
  });

  it('removing Other removes only Other, never otherMaleMembers', () => {
    const parsed = parseMultiSelect('otherMaleMembers, Others - x', BENEFICIARY);
    expect(serializeMultiSelect({ ...parsed, otherSelected: false, otherText: '' }, BENEFICIARY)).toBe('otherMaleMembers');
  });

  it('writes the bare Other key while no text has been typed', () => {
    expect(serializeMultiSelect({ selected: ['pregnantWomen'], otherSelected: true, otherText: '' }, BENEFICIARY)).toBe('pregnantWomen, other');
  });

  it('keeps unknown saved tokens', () => {
    const parsed = parseMultiSelect('pregnantWomen, retiredOption', BENEFICIARY);
    expect(serializeMultiSelect({ ...parsed, selected: [...parsed.selected, 'lactatingWomen'] }, BENEFICIARY))
      .toBe('pregnantWomen, lactatingWomen, retiredOption');
  });
});

describe('single choice with Other', () => {
  it('does not treat answers that contain the word "other" as Other', () => {
    const p = parseSingleChoice('Intended child and other children in the family', 'Others');
    expect(p.isOther).toBe(false);
    expect(p.choice).toBe('Intended child and other children in the family');
  });

  it('reads every stored Other prefix', () => {
    expect(parseSingleChoice('Others - every 10 days', 'Others')).toEqual({ choice: 'Others', otherText: 'every 10 days', isOther: true });
    expect(parseSingleChoice('Other - x, y', 'Other')).toEqual({ choice: 'Other', otherText: 'x, y', isOther: true });
    expect(parseSingleChoice('Any Other - 3 spoons', 'Any Other')).toEqual({ choice: 'Any Other', otherText: '3 spoons', isOther: true });
    expect(parseSingleChoice('Others - in a tin', 'Any other').choice).toBe('Any other');
    expect(parseSingleChoice('Any Other', 'Any Other')).toEqual({ choice: 'Any Other', otherText: '', isOther: true });
  });

  it('writes Other as "Others - <detail>" and plain choices unchanged', () => {
    expect(serializeSingleChoice('Others', 'every 10 days', 'Others')).toBe('Others - every 10 days');
    expect(serializeSingleChoice('Any Other', 'half katori', 'Any Other')).toBe('Others - half katori');
    expect(serializeSingleChoice('Any Other', '', 'Any Other')).toBe('Any Other');
    expect(serializeSingleChoice('Weekly', 'ignored', 'Others')).toBe('Weekly');
  });

  it('isBareOtherToken', () => {
    ['other', 'Others', 'others -', 'Any other', 'othersAdvice'].forEach((t) => expect(isBareOtherToken(t)).toBe(true));
    ['otherMaleMembers', 'Others - x', 'Mother'].forEach((t) => expect(isBareOtherToken(t)).toBe(false));
  });
});
