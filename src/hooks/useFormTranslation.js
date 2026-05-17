import { useTranslation } from 'react-i18next';
import { formTranslations } from 'assets/i18n';

/**
 * Custom hook for form-specific translations
 * @param {string} formName - The name of the form (biannual, followup, household)
 * @returns {object} - Translation function and language info
 */
export const useFormTranslation = (formName) => {
  const { i18n, t: globalT } = useTranslation();
  const currentLanguage = i18n?.language || 'en';
  
  // Get form-specific translations for current language
  const formTranslation = formTranslations[formName]?.[currentLanguage] || formTranslations[formName]?.['en'] || {};
  
  // Create a translation function that uses form-specific translations with safety checks
  const t = (key, options = {}) => {
    // Safety check: if i18n is not ready, return the key or a fallback
    if (!i18n || !globalT) {
      console.warn(`Translation not ready for key: ${key}`);
      return formTranslation[key] || key;
    }
    
    // First try to get from form-specific translations
    if (formTranslation[key]) {
      return formTranslation[key];
    }
    
    // Fallback to global translation if not found in form-specific
    try {
      return globalT(key, options);
    } catch (error) {
      console.warn(`Translation error for key ${key}:`, error);
      return key; // Return the key itself as fallback
    }
  };
  
  return {
    t,
    i18n,
    language: currentLanguage,
    formTranslations: formTranslation
  };
}; 