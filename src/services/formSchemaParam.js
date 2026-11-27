import { formSchemaVersionFor } from "../constants/releaseInfo";

// Survey submissions say which payload schema they were built with (query param:
// no CORS change needed). Queued uploads pass their own stored version, so a
// survey saved by an older build is never labelled with this build's version.
export function addFormSchemaParam(config) {
  if (String(config.method).toLowerCase() !== "post") return config;
  const version = formSchemaVersionFor(config.url);
  if (!version) return config;
  if (config.params?.formSchemaVersion == null) config.params = { ...(config.params || {}), formSchemaVersion: version };
  return config;
}
