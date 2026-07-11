// LAN deployment build: the backend (sam_BE, LAN branch) runs on port 8082 on
// the same office PC that serves this frontend. Resolving the host from the
// browser's own address means the same build works no matter which LAN IP
// that PC ends up with (DHCP), and works from every PC on the LAN without
// per-machine configuration.
const LAN_BACKEND_PORT = 8082;
export const API_BASE_URL = `http://${window.location.hostname}:${LAN_BACKEND_PORT}`;

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

export const APP_VERSION = "2.0.0";

// BEL Admin Configuration
export const BEL_ADMIN_PASSWORD = 'Bel@2025';
export const CACHE_PREFIX = "sam_v2_";
export const JWT_KEY = "iegAccessToken";
export const USER_KEY = "iegUsername";
export const ROLES_KEY = "iegUserRoles";
export const STATE_KEY = "iegUserState";
export const OFFLINE_USER_KEY = "authUser";
