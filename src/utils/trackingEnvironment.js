// Decides whether GA4 and Clarity may load. Tracking runs only in production
// builds served from a non-local host, so local servers, LAN previews and the
// build-time prerender (which runs on localhost) never send data.
const LOCAL_HOSTNAME_PATTERNS = [
  /^localhost$/,
  /\.localhost$/,
  /\.local$/,
  /^127\.\d+\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
];

export const isLocalHostname = (hostname = "") =>
  hostname === "" || LOCAL_HOSTNAME_PATTERNS.some((pattern) => pattern.test(hostname.toLowerCase()));

export const isTrackingAllowed = ({ hostname, isProductionBuild }) =>
  Boolean(isProductionBuild) && !isLocalHostname(hostname);
