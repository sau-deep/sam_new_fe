import { useEffect, useCallback } from 'react';

/**
 * Custom hook to prevent accidental page reloads when form has unsaved data
 * @param {boolean} hasUnsavedChanges - Whether form has unsaved changes
 * @param {string} message - Warning message to show (optional)
 */
export const usePreventPageReload = (
  hasUnsavedChanges, 
  message = "You have unsaved changes. Are you sure you want to leave?"
) => {
  
  const handleBeforeUnload = useCallback((event) => {
    if (hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = message; // Standard way to show confirmation dialog
      return message; // For older browsers
    }
  }, [hasUnsavedChanges, message]);

  useEffect(() => {
    if (hasUnsavedChanges) {
      // Prevent page reload/close
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, handleBeforeUnload]);

  // Function to manually trigger the warning
  const confirmNavigation = useCallback((callback) => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(message);
      if (confirmLeave) {
        callback();
      }
      return confirmLeave;
    } else {
      callback();
      return true;
    }
  }, [hasUnsavedChanges, message]);

  return {
    confirmNavigation
  };
};

export default usePreventPageReload; 