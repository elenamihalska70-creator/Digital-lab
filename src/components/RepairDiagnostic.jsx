import { needsRepairScope, REPAIR_QUESTIONS, REPAIR_TERMS } from "../utils/repairDiagnostic";

export function RepairDiagnostic({ value, onChange, errors, idPrefix, isEnglish }) {
  const lang = isEnglish ? "en" : "fr";
  const t = (fr, en) => isEnglish ? en : fr;
  const question = key => {
    const item = REPAIR_QUESTIONS[key];
    const id = idPrefix + "-repair-" + key;
    return (
      <div className="estimator-question" key={key}>
        <h3 id={id}>{item[lang]}</h3>
        <div className="estimator-options" role="group" aria-labelledby={id}>
          {item.options.map(([option, fr, en]) => (
            <button key={option} type="button" className={value[key] === option ? "is-selected" : ""}
              aria-pressed={value[key] === option} onClick={() => onChange(key, option)}>
              {isEnglish ? en : fr}
            </button>
          ))}
        </div>
      </div>
    );
  };
  const privacyId = idPrefix + "-repair-privacy";
  const field = (key, label, multiline = false) => {
    const id = idPrefix + "-repair-" + key;
    const error = errors[key];
    const props = {
      id, value: value[key], onChange: event => onChange(key, event.target.value),
      maxLength: multiline ? 1500 : 500, autoComplete: "off", spellCheck: false,
      "aria-invalid": Boolean(error), "aria-describedby": privacyId + (error ? " " + id + "-error" : ""),
    };
    return (
      <div className="estimator-question repair-field">
        <label htmlFor={id}>{label}</label>
        {multiline ? <textarea {...props} rows={4} /> : <input {...props} type="url" inputMode="url" placeholder="https://example.com" />}
        {error && <p id={id + "-error"} className="repair-error" role="alert">
          {error === "secret" ? t("Retirez les identifiants ou secrets avant de demander un devis.", "Remove credentials or secrets before requesting a quote.")
            : key === "url" ? t("Utilisez une URL publique http(s), sans identifiants, paramètres ni fragment (#).", "Use a public http(s) URL without credentials, query parameters or a fragment (#).")
              : t("Limitez la description à 1 500 caractères.", "Keep the description within 1,500 characters.")}
        </p>}
      </div>
    );
  };
  return (
    <div className="repair-diagnostic">
      {question("issue")}
      {question("intervention")}
      {question("platform")}
      {needsRepairScope(value) && question("scope")}
      <p className="estimator-hint" id={privacyId}>{REPAIR_TERMS.privacy[lang]}</p>
      {field("url", t("URL publique du site (facultatif)", "Public website URL (optional)"))}
      {question("urgency")}
      {field("description", t("Description du problème (facultatif)", "Problem description (optional)"), true)}
    </div>
  );
}
