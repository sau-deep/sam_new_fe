/**
 * Utility functions for silent WhatsApp error reporting
 */

import { getConsentStatus } from './consentManager';

/**
 * Gets user information from localStorage
 * @returns {Object} - User information object
 */
const getUserInfo = () => {
  try {
    const username = localStorage.getItem("iegUsername");
    const userRoles = localStorage.getItem("iegUserRoles");
    const userState = localStorage.getItem("iegUserState");
    const authUser = localStorage.getItem("authUser");
    
    let parsedRoles = [];
    let parsedAuthUser = null;
    
    if (userRoles) {
      try {
        parsedRoles = JSON.parse(userRoles);
      } catch (e) {
        console.error('Error parsing user roles:', e);
      }
    }
    
    if (authUser) {
      try {
        parsedAuthUser = JSON.parse(authUser);
      } catch (e) {
        console.error('Error parsing auth user:', e);
      }
    }
    
    return {
      username: username || 'Unknown',
      roles: parsedRoles,
      state: userState || 'Not specified',
      authUser: parsedAuthUser,
      // Extract email from authUser if available
      email: parsedAuthUser?.email || 'Not available',
      // Extract name from authUser if available
      name: parsedAuthUser?.name || username || 'Unknown'
    };
  } catch (error) {
    console.error('Error getting user info:', error);
    return {
      username: 'Error retrieving user info',
      roles: [],
      state: 'Error',
      authUser: null,
      email: 'Error',
      name: 'Error'
    };
  }
};

/**
 * Sends a silent WhatsApp error report without showing any UI to the user
 * Only sends if user has given consent
 * @param {string} formType - The type of form that failed
 * @param {string} errorMessage - The error message
 * @param {Object} payload - The form data payload
 * @param {string} whatsappNumber - The WhatsApp number to send to (default: 7701816408)
 * @returns {boolean} - True if message was sent, false if consent not given
 */
export const sendSilentWhatsAppReport = (formType, errorMessage, payload = null, whatsappNumber = "7701816408") => {
  // Check if user has given consent
  const consentStatus = getConsentStatus();
  
  if (!consentStatus.canSendReports) {
    console.log('WhatsApp error report not sent: User has not given consent');
    return false;
  }
  
  const timestamp = new Date().toLocaleString();
  const userInfo = getUserInfo();
  
  let message = `🚨 *Form Submission Error Report*\n\n`;
  message += `📅 *Date & Time:* ${timestamp}\n`;
  message += `📋 *Form Type:* ${formType}\n`;
  message += `❌ *Error:* ${errorMessage}\n\n`;
  
  // Add user information
  message += `👤 *User Information:*\n`;
  message += `- Name: ${userInfo.name}\n`;
  message += `- Username: ${userInfo.username}\n`;
  message += `- Email: ${userInfo.email}\n`;
  message += `- State: ${userInfo.state}\n`;
  message += `- Roles: ${userInfo.roles.map(role => role.authority || role).join(', ') || 'No roles'}\n\n`;
  
  if (payload) {
    message += `📄 *Form Data:*\n`;
    message += `\`\`\`\n${JSON.stringify(payload, null, 2)}\`\`\`\n\n`;
  }
  
  message += `🔧 *Browser Info:*\n`;
  message += `- User Agent: ${navigator.userAgent}\n`;
  message += `- URL: ${window.location.href}\n`;
  message += `- Online Status: ${navigator.onLine ? 'Online' : 'Offline'}\n\n`;
  
  message += `Please help resolve this issue. Thank you!`;
  
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  
  // Open WhatsApp in background (user won't see this)
  const whatsappWindow = window.open(whatsappUrl, '_blank');
  if (whatsappWindow) {
    // Close the window after a short delay to make it less noticeable
    setTimeout(() => {
      whatsappWindow.close();
    }, 100);
  }
  
  console.log('WhatsApp error report sent successfully');
  return true;
};

/**
 * Creates a standardized error message for different error types
 * @param {string} errorType - The type of error (e.g., 'Backend Error', 'Network Error')
 * @param {string|number} statusCode - The HTTP status code
 * @param {string} errorMessage - The specific error message
 * @returns {string} - Formatted error message
 */
export const createErrorMessage = (errorType, statusCode, errorMessage) => {
  return `${errorType} (${statusCode || 'Unknown'}): ${errorMessage}`;
}; 