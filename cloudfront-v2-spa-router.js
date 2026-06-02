// CloudFront Function: SPA router for /v2 sub-path
// Attach this to the Viewer Request event on the /v2/* behavior.
// Rewrites paths like /v2/dashboard -> /v2/index.html
// Passes through static assets unchanged.

function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Only handle /v2/* paths
  if (!uri.startsWith('/v2')) {
    return request;
  }

  // Pass through static assets (has a file extension)
  if (/\/v2\/.*\.[a-zA-Z0-9]+$/.test(uri)) {
    return request;
  }

  // Rewrite everything else to /v2/index.html
  request.uri = '/v2/index.html';
  return request;
}
