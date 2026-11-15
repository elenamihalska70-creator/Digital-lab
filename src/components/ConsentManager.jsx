import { useEffect, useId, useRef, useState } from "react";
import "./ConsentManager.css";
import { CONSENT_OPEN_EVENT, isCurrentConsentUiEnabled } from "../utils/consent.js";
import { saveTrackingConsent } from "../utils/trackingConsent.js";

// Deep link to the cookies section; the policy page exists in French only (hrefLang marks it for English readers).
const PRIVACY_PATH = "/politique-de-confidentialite#cookies";

const COPY = {
  fr: {
    region: "Cookies et mesure d’audience",
    title: "Vos choix sur les cookies",
    text: "Avec votre accord, nous utilisons Google Analytics pour mesurer l’audience et Microsoft Clarity pour enregistrer les interactions avec les pages (clics, défilement), le contenu des pages restant masqué. Le site fonctionne sans ces outils. Rien n’est activé tant que vous n’avez pas choisi ; vous pouvez changer d’avis à tout moment via « Gérer les cookies » en bas de page.",
    policy: "Politique de confidentialité",
    reject: "Tout refuser",
    customize: "Personnaliser",
    accept: "Accepter tout",
    dialogTitle: "Préférences de cookies",
    dialogIntro: "Choisissez les outils facultatifs que vous autorisez. Aucun n’est activé par défaut.",
    necessaryTitle: "Nécessaires",
    necessaryText: "Mémorisation de votre choix sur cet appareil et, si vous vous connectez, session de l’espace client. Toujours actifs : le site ne peut pas fonctionner correctement sans eux.",
    alwaysOn: "Toujours actifs",
    analyticsTitle: "Mesure d’audience",
    analyticsAllow: "Autoriser Google Analytics",
    analyticsText: "Pages consultées, type d’appareil et de navigateur, et utilisation du simulateur (choix de services et de formules, sans texte saisi). Dépose des cookies Google Analytics (_ga).",
    recordingTitle: "Enregistrement de session",
    recordingAllow: "Autoriser Microsoft Clarity",
    recordingText: "Clics, défilement et mouvements sur les pages, avec le contenu des pages et les champs saisis masqués. Dépose des cookies Clarity (_clck, _clsk). Retirer ce choix après activation recharge la page.",
    save: "Enregistrer mes choix",
    close: "Fermer sans changer",
    saved: "Vos choix ont été enregistrés.",
  },
  en: {
    region: "Cookies and analytics",
    title: "Your cookie choices",
    text: "With your consent, we use Google Analytics to measure audience and Microsoft Clarity to record interactions with pages (clicks, scrolling), with page content kept masked. The site works without these tools. Nothing is enabled until you choose; you can change your mind at any time via “Cookie settings” at the bottom of the page.",
    policy: "Privacy policy, cookies section (in French)",
    reject: "Reject all",
    customize: "Customize",
    accept: "Accept all",
    dialogTitle: "Cookie preferences",
    dialogIntro: "Choose which optional tools you allow. None is enabled by default.",
    necessaryTitle: "Necessary",
    necessaryText: "Remembering your choice on this device and, if you sign in, the client-area session. Always active: the site cannot work properly without them.",
    alwaysOn: "Always active",
    analyticsTitle: "Audience measurement",
    analyticsAllow: "Allow Google Analytics",
    analyticsText: "Pages viewed, device and browser type, and use of the estimator (chosen services and packages, never typed text). Sets Google Analytics cookies (_ga).",
    recordingTitle: "Session recording",
    recordingAllow: "Allow Microsoft Clarity",
    recordingText: "Clicks, scrolling and movements on pages, with page content and typed fields masked. Sets Clarity cookies (_clck, _clsk). Withdrawing this choice after activation reloads the page.",
    save: "Save my choices",
    close: "Close without changes",
    saved: "Your choices have been saved.",
  },
};

const currentLanguage = () => (typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "fr");

// Rendered next to <App /> (main.jsx). `initialConsent` is the valid stored choice, or null.
export function ConsentManager({ initialConsent }) {
  const [enabled] = useState(isCurrentConsentUiEnabled);
  const [consent, setConsent] = useState(initialConsent);
  const [draft, setDraft] = useState({ analytics: Boolean(initialConsent?.analytics), recording: Boolean(initialConsent?.recording) });
  const [lang, setLang] = useState(currentLanguage);
  const [status, setStatus] = useState("");
  const dialogRef = useRef(null);
  const id = useId();
  const copy = COPY[lang];

  // Follow the page language set by the App on each navigation (<html lang>).
  useEffect(() => {
    if (!enabled) return undefined;
    const observer = new MutationObserver(() => setLang(currentLanguage()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    const open = () => {
      setDraft({ analytics: Boolean(consent?.analytics), recording: Boolean(consent?.recording) });
      setStatus("");
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
    };
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
  }, [enabled, consent]);

  if (!enabled) return null;

  const decide = (choice) => {
    const { consent: saved } = saveTrackingConsent(choice);
    setConsent(saved ?? { ...choice });
    setDraft({ analytics: choice.analytics, recording: choice.recording });
    setStatus(copy.saved);
    if (dialogRef.current?.open) dialogRef.current.close();
  };
  const rejectAll = () => decide({ analytics: false, recording: false });
  const acceptAll = () => decide({ analytics: true, recording: true });
  const openPreferences = () => {
    setDraft({ analytics: Boolean(consent?.analytics), recording: Boolean(consent?.recording) });
    dialogRef.current?.showModal();
  };

  const buttons = (
    <>
      <button className="consent-button" type="button" onClick={rejectAll}>{copy.reject}</button>
      <button className="consent-button" type="button" onClick={openPreferences} aria-haspopup="dialog">{copy.customize}</button>
      <button className="consent-button" type="button" onClick={acceptAll}>{copy.accept}</button>
    </>
  );

  return (
    <>
      {!consent && (
        <section className="consent-banner" role="region" aria-labelledby={`${id}-title`} lang={lang} data-consent-banner="">
          <h2 id={`${id}-title`}>{copy.title}</h2>
          <p id={`${id}-text`}>
            {copy.text} <a href={PRIVACY_PATH} hrefLang="fr">{copy.policy}</a>
          </p>
          <div className="consent-actions">{buttons}</div>
        </section>
      )}

      <dialog ref={dialogRef} className="consent-dialog" aria-labelledby={`${id}-dialog-title`} lang={lang}
        onClose={() => setDraft({ analytics: Boolean(consent?.analytics), recording: Boolean(consent?.recording) })}>
        <form method="dialog" className="consent-dialog-form" onSubmit={(event) => {
          // Only "Save" submits the form with its own values; the close button uses the native dialog close.
          if (event.nativeEvent.submitter?.value === "save") {
            event.preventDefault();
            decide(draft);
          }
        }}>
          <h2 id={`${id}-dialog-title`}>{copy.dialogTitle}</h2>
          <p>{copy.dialogIntro} <a href={PRIVACY_PATH} hrefLang="fr">{copy.policy}</a></p>

          <fieldset className="consent-category">
            <legend>{copy.necessaryTitle}</legend>
            <p>{copy.necessaryText}</p>
            <p className="consent-always-on">{copy.alwaysOn}</p>
          </fieldset>

          <fieldset className="consent-category">
            <legend>{copy.analyticsTitle}</legend>
            <label className="consent-toggle">
              <input type="checkbox" name="analytics" checked={draft.analytics} aria-describedby={`${id}-analytics-text`}
                onChange={(event) => setDraft((current) => ({ ...current, analytics: event.target.checked }))} />
              <span>{copy.analyticsAllow}</span>
            </label>
            <p id={`${id}-analytics-text`}>{copy.analyticsText}</p>
          </fieldset>

          <fieldset className="consent-category">
            <legend>{copy.recordingTitle}</legend>
            <label className="consent-toggle">
              <input type="checkbox" name="recording" checked={draft.recording} aria-describedby={`${id}-recording-text`}
                onChange={(event) => setDraft((current) => ({ ...current, recording: event.target.checked }))} />
              <span>{copy.recordingAllow}</span>
            </label>
            <p id={`${id}-recording-text`}>{copy.recordingText}</p>
          </fieldset>

          <div className="consent-actions">
            <button className="consent-button" type="button" onClick={rejectAll}>{copy.reject}</button>
            <button className="consent-button" type="submit" value="save">{copy.save}</button>
            <button className="consent-button" type="button" onClick={acceptAll}>{copy.accept}</button>
          </div>
          <button className="consent-close" type="submit" value="close">{copy.close}</button>
        </form>
      </dialog>

      <p className="consent-status" role="status" aria-live="polite" lang={lang}>{status}</p>
    </>
  );
}
