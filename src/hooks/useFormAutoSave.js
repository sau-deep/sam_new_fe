import { useEffect, useRef, useCallback, useState } from 'react';
import { saveFormDraft, getFormDraft, deleteFormDraft, cleanupOldDrafts } from 'utils/indexDB';

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

/**
 * Custom hook for auto-saving form data
 * @param {string} formType - Type of form (e.g., 'biannual', 'household', 'followup')
 * @param {string} formKey - Unique identifier for this specific form instance
 * @param {object} formValues - Current form values from Formik
 * @param {object} coordinates - GPS coordinates if available
 * @param {boolean} isEnabled - Whether auto-save is enabled
 * @param {number} saveInterval - Auto-save interval in milliseconds (default: 3000)
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
  const lastSavedValues = useRef(null);

  // Debounced save function to prevent excessive saving
  const debouncedSave = useCallback(
    debounce(async (values, coords) => {
      if (!isEnabled || !formKey || !formType) return;
      
      // Don't save if values haven't changed
      if (JSON.stringify(values) === JSON.stringify(lastSavedValues.current)) {
        return;
      }

      // Don't save empty forms
      const hasData = Object.values(values).some(value => {
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'string') return value.trim() !== '';
        return value !== null && value !== undefined && value !== '';
      });

      if (!hasData) return;

      setIsSaving(true);
      try {
        const success = await saveFormDraft(formKey, formType, values, coords);
        if (success) {
          setLastSaved(new Date());
          lastSavedValues.current = values;
          console.log(`✅ Auto-saved ${formType} form at ${new Date().toLocaleTimeString()}`);
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }, 1000), // 1 second debounce
    [isEnabled, formKey, formType]
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
      if (draft && draft.formData) {
        setIsDraftRestored(true);
        setLastSaved(new Date(draft.lastModified));
        console.log(`📖 Restored draft for ${formType} form from ${new Date(draft.lastModified).toLocaleString()}`);
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

  // Clear saved draft
  const clearDraft = useCallback(async () => {
    if (!formKey) return;
    
    // Stop any pending save so a cleared draft isn't immediately re-written.
    debouncedSave.cancel();
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    try {
      await deleteFormDraft(formKey);
      setLastSaved(null);
      setIsDraftRestored(false);
      lastSavedValues.current = null;
      console.log(`🗑️ Cleared draft for ${formType} form`);
    } catch (error) {
      console.error('Error clearing form draft:', error);
    }
  }, [formKey, formType, debouncedSave]);

  // Force save immediately
  const forceSave = useCallback(async () => {
    if (!isEnabled || !formKey || !formType) return true;
    
    // Cancel any pending debounced save
    debouncedSave.cancel();
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    // Nothing new to persist
    if (!formValues || JSON.stringify(formValues) === JSON.stringify(lastSavedValues.current)) return true;
    const hasData = Object.values(formValues).some(value => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim() !== '';
      return value !== null && value !== undefined && value !== '';
    });
    if (!hasData) return true;
    
    setIsSaving(true);
    try {
      const success = await saveFormDraft(formKey, formType, formValues, coordinates);
      if (success) {
        setLastSaved(new Date());
        lastSavedValues.current = formValues;
        console.log(`💾 Force-saved ${formType} form`);
      }
      return success;
    } catch (error) {
      console.error('Force save failed:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [formKey, formType, formValues, coordinates, isEnabled, debouncedSave]);

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
    const handleBeforeUnload = (e) => {
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

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