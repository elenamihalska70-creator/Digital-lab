// Decides whether GA4 and Clarity may load. Tracking runs only in production
// builds served from an explicitly allowed production domain, so local
// servers, LAN previews, Vercel previews and the build-time prerender (which
// runs on localhost) never send data.
export const TRACKING_HOSTNAMES = ["digitallab.studio", "www.digitallab.studio"];

export const isTrackingAllowed = ({ hostname = "", isProductionBuild }) =>
  Boolean(isProductionBuild) && TRACKING_HOSTNAMES.includes(hostname.toLowerCase());
