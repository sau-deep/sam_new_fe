/**
 * Consent Manager for WhatsApp Error Reporting
 * Handles user consent for sending error reports via WhatsApp
 */

const CONSENT_KEY = 'sam_whatsapp_error_consent';
const CONSENT_TIMESTAMP_KEY = 'sam_whatsapp_consent_timestamp';

/**
 * Check if user has given consent for WhatsApp error reporting
 * @returns {boolean} - True if user has consented
 */
export const hasWhatsAppConsent = () => {
  try {
    const consent = localStorage.getItem(CONSENT_KEY);
    return consent === 'true';
  } catch (error) {
    console.error('Error checking WhatsApp consent:', error);
    return false;
  }
};

/**
 * Set user consent for WhatsApp error reporting
 * @param {boolean} consent - User's consent decision
 */
export const setWhatsAppConsent = (consent) => {
  try {
    localStorage.setItem(CONSENT_KEY, consent.toString());
    localStorage.setItem(CONSENT_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error setting WhatsApp consent:', error);
  }
};

/**
 * Get consent timestamp
 * @returns {Date|null} - When consent was given, or null if not set
 */
export const getConsentTimestamp = () => {
  try {
    const timestamp = localStorage.getItem(CONSENT_TIMESTAMP_KEY);
    return timestamp ? new Date(parseInt(timestamp)) : null;
  } catch (error) {
    console.error('Error getting consent timestamp:', error);
    return null;
  }
};

/**
 * Revoke user consent for WhatsApp error reporting
 */
export const revokeWhatsAppConsent = () => {
  try {
    localStorage.removeItem(CONSENT_KEY);
    localStorage.removeItem(CONSENT_TIMESTAMP_KEY);
  } catch (error) {
    console.error('Error revoking WhatsApp consent:', error);
  }
};

/**
 * Check if consent is still valid (not expired)
 * @param {number} expiryDays - Number of days until consent expires (default: 365)
 * @returns {boolean} - True if consent is still valid
 */
export const isConsentValid = (expiryDays = 365) => {
  try {
    if (!hasWhatsAppConsent()) {
      return false;
    }
    
    const consentTime = getConsentTimestamp();
    if (!consentTime) {
      return false;
    }
    
    const now = new Date();
    const expiryTime = new Date(consentTime.getTime() + (expiryDays * 24 * 60 * 60 * 1000));
    
    return now < expiryTime;
  } catch (error) {
    console.error('Error checking consent validity:', error);
    return false;
  }
};

/**
 * Get consent status with details
 * @returns {Object} - Consent status object
 */
export const getConsentStatus = () => {
  const hasConsent = hasWhatsAppConsent();
  const isValid = isConsentValid();
  const timestamp = getConsentTimestamp();
  
  return {
    hasConsent,
    isValid,
    timestamp,
    canSendReports: hasConsent && isValid
  };
}; 