// Which account "owns" local data (queued surveys, drafts, cached API responses).
//
// Always the LOGIN ID — never the display name. Two surveyors can share a display
// name, and a display name can be edited on the Profile page; keying ownership on
// it let one surveyor's queued survey upload under another account.
import { JWT_KEY, OWNER_KEY } from "../config";
import { parseJwt } from "./jwt";

export function getCurrentOwnerId() {
  try {
    const stored = localStorage.getItem(OWNER_KEY);
    if (stored) return stored;
    // Sessions that signed in before OWNER_KEY existed: the JWT subject is the login id.
    const token = localStorage.getItem(JWT_KEY);
    const sub = token ? parseJwt(token)?.sub : null;
    return typeof sub === "string" && sub.trim() ? sub.trim() : null;
  } catch {
    return null;
  }
}

/** Login id from a sign-in response: the explicit loginId, else the token's subject. */
export function loginIdFromSignIn(data) {
  const explicit = typeof data?.loginId === "string" ? data.loginId.trim() : "";
  if (explicit) return explicit;
  const sub = data?.accessToken ? parseJwt(data.accessToken)?.sub : null;
  return typeof sub === "string" && sub.trim() ? sub.trim() : null;
}
