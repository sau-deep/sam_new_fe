export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "https://api.coecmamsupport.com";
//export const API_BASE_URL = "http://localhost:8082"

export const SURVEY_FORMS = {
  HOUSE_HOLD: true,
  BI_ANNUAL: true,
  FOLLOWUP: true,
  ROUTINE_MONITORING: true,
};

export const ROLES = {
  ADMIN: "ROLE_ADMIN",
  STATE: "ROLE_STATE",
  UNICEF: "ROLE_UNICEF",
  IEG: "ROLE_IEG",
  SURVEYOR: "ROLE_SURVEYOR",
};

// Real build identity — see src/constants/releaseInfo.js
export { APP_VERSION } from "../constants/appInfo";

// BEL Admin Configuration
export const BEL_ADMIN_PASSWORD = 'Bel@2025';
export const CACHE_PREFIX = "sam_v2_";
export const JWT_KEY = "iegAccessToken";
export const USER_KEY = "iegUsername";
// The signed-in account's LOGIN ID (JWT subject). USER_KEY above holds the display
// name for historical reasons and must never be used to tell accounts apart.
export const OWNER_KEY = "samOwnerId";
export const ROLES_KEY = "iegUserRoles";
export const STATE_KEY = "iegUserState";
export const OFFLINE_USER_KEY = "authUser";
