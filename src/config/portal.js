// The preserved portal is available only through an explicit loopback Vite dev session.
export const portalEnabled =
  import.meta.env.DL_LOCAL_PORTAL_DEV_SERVER &&
  import.meta.env.DEV &&
  import.meta.env.VITE_ENABLE_LOCAL_PORTAL === "true" &&
  ["127.0.0.1", "localhost", "[::1]"].includes(window.location.hostname);

export const isPortalPath = (pathname) =>
  /^\/(?:login|dashboard|espace-client|admin|sign-up|signup|register)(?:\/|$)/i.test(pathname);
