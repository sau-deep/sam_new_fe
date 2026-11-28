// Opening files that ship inside the Android app (audit P04).
//
// In the app the web files (public/ → www/) are inside the APK and the WebView's origin is
// local to the device: download links do nothing, an online viewer cannot fetch the file and
// Android WebView has no Web Share API. sam_surveyor_app registers a small native plugin,
// SamFiles (android/app/src/main/java/com/diva/sam/SamFilesPlugin.java), that copies a
// bundled file out of the APK and opens it with an installed app, or offers the share sheet
// when no app can view that type. Older app builds do not have it: callers fall back.
import { Capacitor, registerPlugin } from '@capacitor/core';

const SamFiles = registerPlugin('SamFiles');

const MIME_TYPES = Object.freeze({
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf: 'application/pdf',
});

/** True in an app build that can open bundled files natively. */
export function canOpenBundledFiles() {
  try {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('SamFiles');
  } catch {
    return false;
  }
}

/**
 * The path of a file served by this app ('/x.pdf', 'x.pdf' or a same-origin URL), or null
 * for another host. The native side refuses anything that is not a plain relative path.
 */
export function bundledPath(url) {
  const raw = String(url || '').trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw, window.location.href);
    return parsed.origin === window.location.origin ? parsed.pathname : null;
  } catch {
    return null;
  }
}

/**
 * Open a bundled file (a path under public/, e.g. '/Mobile_SoP_Routine_Monitoring.pptx').
 * Resolves { action: 'view' | 'share' }. Rejects when the plugin is missing or the device
 * cannot open the file (error.code: BAD_PATH, NOT_FOUND, NO_APP, UNIMPLEMENTED…).
 */
export async function openBundledFile(url, { title } = {}) {
  if (!canOpenBundledFiles()) {
    const err = new Error('Opening bundled files is not supported by this app version');
    err.code = 'UNIMPLEMENTED';
    throw err;
  }
  const path = bundledPath(url);
  if (!path) {
    const err = new Error('Not a file of this app');
    err.code = 'BAD_PATH';
    throw err;
  }
  const ext = path.split('.').pop().toLowerCase();
  return SamFiles.openBundledFile({ path, mimeType: MIME_TYPES[ext], title });
}
