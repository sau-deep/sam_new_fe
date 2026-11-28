import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { saveFormDraft, getFormDraft, deleteFormDraft, cleanupOldDrafts, getCurrentOwnerId } from 'utils/indexDB';

// Fields the app fills in by itself (GPS, response mode). Changes to these alone
// are not "the surveyor entered something".
const AUTO_FILLED_FIELD = /^(latitude|longitude|location|location[A-Z]\w*|responseMode)$/;

const sameValue = (a, b) => {
  if (a === b) return true;
  if ((a === '' || a == null) && (b === '' || b == null)) return true;
  if (typeof a === 'object' || typeof b === 'object') return JSON.stringify(a) === JSON.stringify(b);
  return false;
};

/**
 * True when the surveyor changed anything compared with the form's initial
 * values (prefilled state/date/defaults don't count). Used to decide whether a
 * draft is worth saving or a reload warning is needed.
 */
export function hasUserChanges(values, initialValues) {
  if (!values) return false;
  const init = initialValues || {};
  const keys = new Set([...Object.keys(values), ...Object.keys(init)]);
  for (const key of keys) {
    if (AUTO_FILLED_FIELD.test(key)) continue;
    if (!sameValue(values[key], init[key])) return true;
  }
  return false;
}

// Every mounted auto-saving form registers a flush function here so an update
// or explicit "Save and update" can await durable saves of all open forms.
const activeFlushers = new Set();

/** Await a durable save of every mounted auto-saving form. Resolves to true only if all succeeded. */
export async function flushAllFormDrafts() {
  const results = await Promise.all([...activeFlushers].map(fn => fn().then(ok => ok !== false, () => false)));
  return results.every(Boolean);
}

// Simple debounce function with cancel method
const debounce = (func, wait) => {
  let timeout;
  
  const debouncedFunction = function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
  
  // Add cancel method to the debounced function
  debouncedFunction.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  
  return debouncedFunction;
};

const hasAnyData = (values) => !!values && Object.values(values).some(value => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim() !== '';
  return value !== null && value !== undefined && value !== '';
});

const snapshotOf = (values) => {
  try { return JSON.stringify(values); } catch { return null; }
};

/**
 * Custom hook for auto-saving form data
 * @param {string} formType - Type of form (e.g., 'biannual', 'household', 'followup')
 * @param {string} formKey - Unique identifier for this specific form instance
 *   (use stableDraftKey(formType) so the draft is found again after reopening)
 * @param {object} formValues - Current form values from Formik; callers may add extra
 *   keys (e.g. nested section state) so the whole questionnaire is restored
 * @param {object} coordinates - GPS coordinates if available
 * @param {boolean} isEnabled - Whether auto-save is enabled
 * @param {number} saveInterval - Auto-save interval in milliseconds (default: 3000)
 *
 * Durability rules (audit A06):
 *  - Writes are serialized, so an older snapshot can never overwrite a newer one,
 *    and clearDraft() runs after any write already in flight.
 *  - forceSave() resolves true only after the draft is durably stored (false on a
 *    storage failure). Callers leaving through the UI or queueing must await it.
 *  - Page unload / unmount saves are best effort only.
 *  - A draft saved by another account is never restored here.
 *  - Current-format drafts are never deleted by age.
 */
export const useFormAutoSave = (
  formType,
  formKey,
  formValues,
  coordinates = null,
  isEnabled = true,
  saveInterval = 3000 // 3 seconds
) => {
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const saveTimeoutRef = useRef(null);
  const isInitialMount = useRef(true);
  // JSON snapshot of the last values durably written (null = nothing written yet).
  const lastSavedSnapshot = useRef(null);
  // Values at the moment the draft was cleared: re-saving the same values would
  // resurrect a draft that was just submitted/queued/declined.
  const clearedSnapshot = useRef(null);
  const clearedSinceLastSave = useRef(false);
  const writeChain = useRef(Promise.resolve());

  // Latest inputs, for the unmount flush and other callbacks that outlive a render.
  const latest = useRef({ formType, formKey, formValues, coordinates, isEnabled });
  latest.current = { formType, formKey, formValues, coordinates, isEnabled };

  // Run storage operations strictly one after another.
  const enqueue = useCallback((task) => {
    const run = writeChain.current.then(task, task);
    writeChain.current = run.catch(() => {});
    return run;
  }, []);

  // Durably write one snapshot (queued). Resolves true when stored or when there is
  // nothing new to store; throws if storage failed.
  const persist = useCallback((values, coords) => enqueue(async () => {
    const { formKey: key, formType: type } = latest.current;
    if (!key || !type || !values) return true;
    const snapshot = snapshotOf(values);
    if (snapshot != null && snapshot === lastSavedSnapshot.current) return true;
    if (snapshot != null && snapshot === clearedSnapshot.current) return true;
    if (!hasAnyData(values)) return true;

    setIsSaving(true);
    try {
      const success = await saveFormDraft(key, type, values, coords);
      if (success) {
        lastSavedSnapshot.current = snapshot;
        clearedSinceLastSave.current = false;
        setLastSaved(new Date());
      }
      return success;
    } finally {
      setIsSaving(false);
    }
  }), [enqueue]);

  // Debounced save function to prevent excessive saving
  const debouncedSave = useMemo(
    () => debounce(async (values, coords) => {
      if (!isEnabled || !formKey || !formType) return;
      try {
        await persist(values, coords);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 1000), // 1 second debounce
    [isEnabled, formKey, formType, persist]
  );

  // Auto-save when form values change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave(formValues, coordinates);
    }, saveInterval);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formValues, coordinates, debouncedSave, saveInterval]);

  // Load saved draft on component mount
  const loadDraft = useCallback(async () => {
    if (!formKey || !formType || isDraftRestored) return null;

    try {
      const draft = await getFormDraft(formKey);
      const owner = getCurrentOwnerId();
      if (draft?.ownerId && owner && draft.ownerId !== owner) {
        // Another account's draft: never shown or restored in this session.
        return null;
      }
      if (draft && draft.formData) {
        setIsDraftRestored(true);
        setLastSaved(new Date(draft.lastModified));
        lastSavedSnapshot.current = snapshotOf(draft.formData);
        return {
          formData: draft.formData,
          coordinates: draft.coordinates,
          lastModified: draft.lastModified
        };
      }
    } catch (error) {
      console.error('Error loading form draft:', error);
    }
    return null;
  }, [formKey, formType, isDraftRestored]);

  // Clear saved draft (after submit/queue, or when the user declines to restore).
  const clearDraft = useCallback(async () => {
    if (!formKey) return;

    // Stop any pending save so a cleared draft isn't immediately re-written.
    debouncedSave.cancel();
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    clearedSnapshot.current = snapshotOf(latest.current.formValues);
    clearedSinceLastSave.current = true;
    try {
      // Queued behind any write already in flight, so that write cannot land afterwards.
      await enqueue(() => deleteFormDraft(formKey));
      setLastSaved(null);
      setIsDraftRestored(false);
      lastSavedSnapshot.current = null;
    } catch (error) {
      console.error('Error clearing form draft:', error);
    }
  }, [formKey, debouncedSave, enqueue]);

  // Save immediately and wait until it is durable. Resolves true when stored (or
  // nothing new to store), false when storage failed.
  const forceSave = useCallback(async () => {
    if (!isEnabled || !formKey || !formType) return true;

    // Cancel any pending debounced save; this save covers it.
    debouncedSave.cancel();
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    try {
      return await persist(formValues, coordinates);
    } catch (error) {
      console.error('Force save failed:', error);
      return false;
    }
  }, [formKey, formType, formValues, coordinates, isEnabled, debouncedSave, persist]);

  // Only drafts left by older builds under random keys (unreachable from any
  // screen) are removed after 7 days, as before. Current drafts are never aged out.
  useEffect(() => {
    cleanupOldDrafts();
  }, []);

  // Register for flushAllFormDrafts().
  const forceSaveRef = useRef(forceSave);
  forceSaveRef.current = forceSave;
  useEffect(() => {
    const flusher = () => forceSaveRef.current();
    activeFlushers.add(flusher);
    return () => { activeFlushers.delete(flusher); };
  }, []);

  // Handle page unload - try to save before leaving
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isEnabled && formKey && formType) {
        // Best effort only: the browser does not wait for this async save.
        // Durable paths (Save and update, explicit save) must await forceSave/flushAllFormDrafts.
        forceSave();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isEnabled) {
        // Page is becoming hidden (user switching tabs, minimizing, etc.)
        forceSave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isEnabled, formKey, formType, forceSave]);

  // Cancel pending timers when the save function changes or on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  // Unmount (leaving the screen): best-effort save of answers typed since the last
  // auto-save, unless the draft was just cleared (submitted / queued / declined).
  useEffect(() => {
    return () => {
      const { formKey: key, formType: type, formValues: values, coordinates: coords, isEnabled: enabled } = latest.current;
      if (!enabled || !key || !type || clearedSinceLastSave.current) return;
      persist(values, coords).catch(error => console.error('Auto-save on leave failed:', error));
    };
  }, [persist]);

  return {
    loadDraft,
    clearDraft,
    forceSave,
    lastSaved,
    isSaving,
    isDraftRestored
  };
};

export default useFormAutoSave;
