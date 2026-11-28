// Draft support for the Routine Monitoring section components (audit A06).
//
// Each section keeps its answers in its own React state. To let autosave
// capture them and a restored draft rehydrate them, a section:
//   const sectionDraft = useSectionDraft(ref, props, { triggerValidation });
//   const [x, setX] = useDraftField(sectionDraft, 'x', '');
// useDraftField behaves like useState, but its first value comes from the
// restored draft (props.initialDraft) and its current value is reported to the
// page (props.onDraftChange) so autosave stores it. Restoring a draft remounts
// the section with a new initialDraft, so every field starts from the saved
// value and the DOM that submission reads shows the same answers.

import { useEffect, useImperativeHandle, useRef, useState } from 'react';

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Use a saved value only when it has the same shape as the field's default. */
export function restoreValue(saved, initial) {
  if (saved === undefined) return initial;
  if (Array.isArray(initial)) return Array.isArray(saved) ? saved : initial;
  if (isPlainObject(initial)) return isPlainObject(saved) ? { ...initial, ...saved } : initial;
  if (typeof initial === 'string') return saved === null ? '' : (typeof saved === 'string' ? saved : String(saved));
  return saved;
}

/**
 * Register a section with the page's draft. Returns the handle that
 * useDraftField needs. `handle` is merged into the imperative ref
 * (e.g. { triggerValidation }) together with getDraftState().
 */
export function useSectionDraft(ref, props, handle = {}) {
  const { sectionId, initialDraft, onDraftChange } = props || {};
  const registry = useRef(null);
  if (!registry.current) {
    registry.current = { initial: initialDraft || null, values: {}, encoders: {}, pristine: null, restored: !!initialDraft };
  }
  const draft = registry.current;
  draft.values = {};

  const onChangeRef = useRef(onDraftChange);
  onChangeRef.current = onDraftChange;
  const lastSent = useRef(null);

  const snapshot = () => {
    const out = {};
    Object.entries(draft.values).forEach(([k, v]) => {
      const encode = draft.encoders[k];
      out[k] = encode ? encode(v) : v;
    });
    return out;
  };

  useImperativeHandle(ref, () => ({ ...handle, getDraftState: snapshot }));

  // Report changes after every render (cheap JSON compare).
  useEffect(() => {
    const values = snapshot();
    const json = JSON.stringify(values);
    if (draft.pristine === null) draft.pristine = json;
    if (json === lastSent.current) return;
    lastSent.current = json;
    const dirty = draft.restored || json !== draft.pristine;
    if (onChangeRef.current && sectionId) onChangeRef.current(sectionId, JSON.parse(json), dirty);
  });

  // Tell the page this section is gone (activity / household section changed).
  useEffect(() => () => {
    if (onChangeRef.current && sectionId) onChangeRef.current(sectionId, undefined, false);
  }, [sectionId]);

  return draft;
}

/**
 * useState for one answer of a section, restored from the draft on mount.
 * `codec` ({ encode, decode }) converts values that are not plain JSON (dayjs).
 */
export function useDraftField(draft, key, initialValue, codec = null) {
  const [value, setValue] = useState(() => {
    const initial = typeof initialValue === 'function' ? initialValue() : initialValue;
    const saved = draft?.initial && Object.prototype.hasOwnProperty.call(draft.initial, key)
      ? draft.initial[key]
      : undefined;
    if (saved === undefined) return initial;
    return codec?.decode ? codec.decode(saved, initial) : restoreValue(saved, initial);
  });
  if (draft) {
    draft.values[key] = value;
    if (codec?.encode) draft.encoders[key] = codec.encode;
  }
  return [value, setValue];
}

/** Report a value held outside useDraftField (e.g. a shared hook); returns its saved copy. */
export function registerDraftValue(draft, key, value) {
  if (draft) draft.values[key] = value;
  return draft?.initial ? draft.initial[key] : undefined;
}
