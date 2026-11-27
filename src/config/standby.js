import { TRACKING_HOSTNAMES } from "../utils/trackingEnvironment.js";

export const standbyMode = import.meta.env?.MODE;
export const standbyTest = standbyMode === "cloudflare-test";
export const standbyActionsDisabled = standbyTest || (
  standbyMode === "cloudflare-failover" &&
  (typeof window === "undefined" || !TRACKING_HOSTNAMES.includes(window.location.hostname))
);
export const standbyActionHref = "/#standby-mode";
export const publicActionHref = (href) => standbyActionsDisabled ? standbyActionHref : href;
