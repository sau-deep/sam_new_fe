// Decode a JWT payload without verifying it (the server verifies; this is for
// reading claims such as `sub` and `exp` on the client).
export function parseJwt(token) {
  try {
    // Handle URL-safe base64 (replace - with + and _ with /, add padding)
    const base64 = String(token).split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "==".slice(0, (4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}
