import { useEffect, useRef, useCallback, useState } from 'react';
import { saveFormDraft, getFormDraft, deleteFormDraft, cleanupOldDrafts } from 'utils/indexDB';

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
    
    try {
      await deleteFormDraft(formKey);
      setLastSaved(null);
      setIsDraftRestored(false);
      lastSavedValues.current = null;
      console.log(`🗑️ Cleared draft for ${formType} form`);
    } catch (error) {
      console.error('Error clearing form draft:', error);
    }
  }, [formKey, formType]);

  // Force save immediately
  const forceSave = useCallback(async () => {
    if (!isEnabled || !formKey || !formType) return;
    
    // Cancel any pending debounced save
    debouncedSave.cancel();
    
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

  // Cleanup old drafts on mount
  useEffect(() => {
    cleanupOldDrafts();
  }, []);

  // Handle page unload - try to save before leaving
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isEnabled && formKey && formType) {
        // Try to save synchronously before page unload
        navigator.sendBeacon && navigator.sendBeacon('/api/keepalive'); // Optional: keep connection alive
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