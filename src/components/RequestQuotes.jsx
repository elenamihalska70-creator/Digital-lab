import { useEffect, useMemo, useRef, useState } from "react";
import {
  calculateQuoteAmounts,
  createQuote,
  getQuotesForRequest,
  updateQuote,
  updateQuoteStatus,
} from "../services/quotes";
import { generateQuotePdf, getQuoteReference } from "../services/quotePdf";

const defaultQuoteValues = {
  title: "",
  description: "",
  price_ht: "",
  vat: 20,
  deposit_percent: 30,
  estimated_delay: "",
  valid_until: "",
  payment_terms: "Acompte à validation du devis. Solde à la livraison.",
  status: "draft",
};

const statusLabels = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  refused: "Refusé",
  expired: "Expiré",
};

const formatMoney = (value) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value) || 0);

const formatDate = (date) => {
  if (!date) {
    return "Non définie";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
};

function QuoteStatusBadge({ status }) {
  return <span className={`quote-status is-${status || "draft"}`}>{statusLabels[status] || "Brouillon"}</span>;
}

function QuoteForm({ formRef, initialValues, mode, onCancel, onSubmit, isSaving }) {
  const [values, setValues] = useState(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const amounts = useMemo(
    () =>
      calculateQuoteAmounts({
        priceHt: values.price_ht,
        vat: values.vat,
        depositPercent: values.deposit_percent,
      }),
    [values.deposit_percent, values.price_ht, values.vat],
  );

  const updateValue = (key, value) => setValues((currentValues) => ({ ...currentValues, [key]: value }));

  return (
    <form
      className="quote-form"
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <div className="quote-form-grid">
        <label>
          Titre du projet
          <input required value={values.title} onChange={(event) => updateValue("title", event.target.value)} />
        </label>
        <label>
          Prix HT
          <input
            min="0"
            step="0.01"
            type="number"
            value={values.price_ht}
            onChange={(event) => updateValue("price_ht", event.target.value)}
          />
        </label>
        <label className="quote-form-wide">
          Description
          <textarea
            required
            value={values.description}
            onChange={(event) => updateValue("description", event.target.value)}
          ></textarea>
        </label>
        <label>
          TVA %
          <input
            min="0"
            step="0.1"
            type="number"
            value={values.vat}
            onChange={(event) => updateValue("vat", event.target.value)}
          />
        </label>
        <label>
          Acompte %
          <input
            min="0"
            max="100"
            step="1"
            type="number"
            value={values.deposit_percent}
            onChange={(event) => updateValue("deposit_percent", event.target.value)}
          />
        </label>
        <label>
          Délai estimé
          <input value={values.estimated_delay} onChange={(event) => updateValue("estimated_delay", event.target.value)} />
        </label>
        <label>
          Validité
          <input type="date" value={values.valid_until} onChange={(event) => updateValue("valid_until", event.target.value)} />
        </label>
        <label className="quote-form-wide">
          Conditions de paiement
          <textarea
            value={values.payment_terms}
            onChange={(event) => updateValue("payment_terms", event.target.value)}
          ></textarea>
        </label>
      </div>

      <div className="quote-calculation-preview">
        <span>TTC : {formatMoney(amounts.price_ttc)}</span>
        <span>Acompte : {formatMoney(amounts.deposit_amount)}</span>
        <span>Solde : {formatMoney(amounts.remaining_amount)}</span>
      </div>

      <div className="quote-actions">
        <button className="btn btn-primary" type="submit" disabled={isSaving}>
          {isSaving ? "Enregistrement..." : mode === "edit" ? "Enregistrer" : "Créer le devis"}
        </button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </form>
  );
}

function QuoteApprovalState({ quote }) {
  if (quote.status === "accepted") {
    return (
      <div className="quote-approval-card is-accepted">
        <span>✓ Devis accepté</span>
        <p>Merci pour votre confiance. Votre projet va maintenant entrer en phase de développement.</p>
      </div>
    );
  }

  if (quote.status === "refused") {
    return (
      <div className="quote-approval-card is-refused">
        <span>Le devis a été refusé.</span>
        {quote.client_comment && <p>{quote.client_comment}</p>}
      </div>
    );
  }

  if (quote.status === "sent") {
    return (
      <div className="quote-approval-card is-ready">
        <span>Votre devis est prêt.</span>
        <p>Vous pouvez le télécharger, l’accepter officiellement ou demander une modification.</p>
      </div>
    );
  }

  return null;
}

function QuoteEvents({ quote }) {
  const events = [
    { label: "Devis créé", date: quote.created_at, isDone: true },
    { label: "Devis envoyé", date: quote.sent_at, isDone: quote.status !== "draft" },
    { label: "Devis accepté", date: quote.accepted_at, isDone: quote.status === "accepted" },
    { label: "Devis refusé", date: quote.refused_at, isDone: quote.status === "refused" },
  ];

  return (
    <div className="quote-events" aria-label="Timeline du devis">
      {events.map((event) => (
        <div className={event.isDone ? "is-done" : ""} key={event.label}>
          <span>{event.isDone ? "✓" : "○"}</span>
          <p>{event.label}</p>
          {event.date && <small>{formatDate(event.date)}</small>}
        </div>
      ))}
    </div>
  );
}

function QuoteView({
  clientComment,
  isRefusing,
  isSaving,
  onClientCommentChange,
  onDuplicate,
  onEdit,
  onPdfDownload,
  onRefuseCancel,
  onRefuseStart,
  onSendQuote,
  onStatusChange,
  quote,
  request,
  role,
}) {
  if (!quote) {
    return null;
  }

  return (
    <article className="quote-view">
      <div className="quote-view-heading">
        <div>
          <span>Devis {getQuoteReference(request, quote)}</span>
          <h3>{quote.title}</h3>
          <p>Version {quote.version} · Créé le {formatDate(quote.created_at)}</p>
        </div>
        <QuoteStatusBadge status={quote.status} />
      </div>

      {role === "client" && <QuoteApprovalState quote={quote} />}
      {role === "admin" && quote.status === "accepted" && (
        <div className="quote-approval-card is-accepted">
          <span>ACCEPTÉ</span>
          <p>Accepté le {formatDate(quote.accepted_at)}.</p>
        </div>
      )}
      {role === "admin" && quote.status === "sent" && (
        <div className="quote-approval-card is-ready">
          <span>DEVIS ENVOYÉ</span>
          <p>Envoyé le {formatDate(quote.sent_at || quote.updated_at)}.</p>
        </div>
      )}
      {role === "admin" && quote.status === "refused" && (
        <div className="quote-approval-card is-refused">
          <span>REFUSÉ</span>
          <p>Refusé le {formatDate(quote.refused_at)}.</p>
          {quote.client_comment && <p>{quote.client_comment}</p>}
        </div>
      )}

      <p className="quote-description">{quote.description}</p>

      <div className="quote-price-grid">
        <div><span>Prix HT</span><strong>{formatMoney(quote.price_ht)}</strong></div>
        <div><span>TVA</span><strong>{quote.vat || 0}%</strong></div>
        <div><span>Total TTC</span><strong>{formatMoney(quote.price_ttc)}</strong></div>
        <div><span>Acompte</span><strong>{formatMoney(quote.deposit_amount)}</strong></div>
        <div><span>Solde</span><strong>{formatMoney(quote.remaining_amount)}</strong></div>
        <div><span>Délai</span><strong>{quote.estimated_delay || "À définir"}</strong></div>
      </div>

      <div className="quote-terms-grid">
        <article>
          <span>Validité</span>
          <p>{formatDate(quote.valid_until)}</p>
        </article>
        <article>
          <span>Conditions de paiement</span>
          <p>{quote.payment_terms || "À définir"}</p>
        </article>
      </div>

      <div className="quote-actions quote-primary-actions">
        <button className="btn btn-primary quote-download-button" type="button" onClick={onPdfDownload}>
          Télécharger le PDF
        </button>
        {role === "admin" ? (
          <>
            {quote.status === "draft" && (
              <button className="btn btn-secondary" type="button" onClick={onEdit}>
                Modifier
              </button>
            )}
            <button
              className="btn btn-secondary"
              type="button"
              disabled={isSaving}
              onClick={onSendQuote}
            >
              {quote.status === "sent" ? "Renvoyer" : "Envoyer au client"}
            </button>
            <button className="btn btn-secondary" type="button" onClick={onDuplicate}>
              Nouvelle version
            </button>
          </>
        ) : (
          <>
            {quote.status === "sent" && (
              <>
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    if (window.confirm("Confirmer l'acceptation du devis ?")) {
                      onStatusChange("accepted");
                    }
                  }}
                >
                  Accepter le devis
                </button>
                <button className="btn btn-secondary" type="button" disabled={isSaving} onClick={onRefuseStart}>
                  Refuser
                </button>
              </>
            )}
          </>
        )}
      </div>

      {role === "client" && isRefusing && quote.status === "sent" && (
        <div className="quote-refusal-form">
          <label>
            Votre commentaire (facultatif)
            <textarea value={clientComment} onChange={(event) => onClientCommentChange(event.target.value)}></textarea>
          </label>
          <div className="quote-actions">
            <button className="btn btn-primary" type="button" disabled={isSaving} onClick={() => onStatusChange("refused")}>
              Confirmer le refus
            </button>
            <button className="btn btn-secondary" type="button" onClick={onRefuseCancel}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {role === "admin" && (
        <div className="quote-actions quote-status-actions">
          <>
            {["draft", "sent", "accepted", "refused", "expired"].map((status) => (
              <button
                className={`quote-status-button${quote.status === status ? " is-active" : ""}`}
                disabled={isSaving}
                key={status}
                type="button"
                onClick={() => onStatusChange(status)}
              >
                {statusLabels[status]}
              </button>
            ))}
          </>
        </div>
      )}

      <QuoteEvents quote={quote} />
    </article>
  );
}

export function RequestQuotes({ request, role, session, onQuoteChange }) {
  const [quotes, setQuotes] = useState([]);
  const [mode, setMode] = useState("view");
  const [editingQuote, setEditingQuote] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefusing, setIsRefusing] = useState(false);
  const [clientComment, setClientComment] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [pdfErrorMessage, setPdfErrorMessage] = useState("");
  const moduleRef = useRef(null);
  const formRef = useRef(null);
  const noticeRef = useRef(null);

  const visibleQuotes = quotes;
  const latestQuote = visibleQuotes[0] ?? null;

  const loadQuotes = async () => {
    if (!request?.id) {
      setQuotes([]);
      onQuoteChange?.(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await getQuotesForRequest(request.id);

    if (error) {
      console.error("QUOTE LOAD ERROR:", error);
      setErrorMessage("Les devis n’ont pas pu être chargés pour le moment.");
      setQuotes([]);
      onQuoteChange?.(null);
    } else {
      const nextQuotes = data ?? [];
      const nextVisibleQuotes = nextQuotes;
      setQuotes(nextQuotes);
      onQuoteChange?.(nextVisibleQuotes[0] ?? null);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadQuotes();
  }, [request?.id]);

  const startCreate = () => {
    setEditingQuote(null);
    setMode("create");
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      formRef.current?.querySelector("input, textarea, select, button")?.focus();
    }, 80);
  };

  const startEdit = () => {
    setEditingQuote(latestQuote);
    setMode("edit");
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      formRef.current?.querySelector("input, textarea, select, button")?.focus();
    }, 80);
  };

  const startDuplicate = () => {
    setEditingQuote({ ...latestQuote, status: "draft" });
    setMode("create");
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      formRef.current?.querySelector("input, textarea, select, button")?.focus();
    }, 80);
  };

  const buildInitialValues = () => {
    const source = editingQuote ?? {
      ...defaultQuoteValues,
      title: request?.project_type || "",
      description: request?.message || "",
    };

    return {
      ...defaultQuoteValues,
      ...source,
      price_ht: source.price_ht ?? "",
      vat: source.vat ?? 20,
      deposit_percent: source.deposit_percent ?? 30,
      valid_until: source.valid_until ?? "",
      status: source.status ?? "draft",
    };
  };

  const handleSubmit = async (values) => {
    setIsSaving(true);
    setErrorMessage("");

    const latestVersion = quotes.reduce((maxVersion, quote) => Math.max(maxVersion, quote.version || 0), 0);
    const { error } =
      mode === "edit" && editingQuote?.id
        ? await updateQuote({ quoteId: editingQuote.id, values })
        : await createQuote({
            requestId: request.id,
            createdBy: session?.user?.id,
            values,
            latestVersion,
          });

    if (error) {
      console.error("QUOTE SAVE ERROR:", error);
      setErrorMessage("Le devis n’a pas pu être enregistré. Réessayez dans quelques instants.");
    } else {
      setMode("view");
      setEditingQuote(null);
      await loadQuotes();
    }

    setIsSaving(false);
  };

  const handleStatusChange = async (status) => {
    if (!latestQuote?.id) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const { error } = await updateQuoteStatus({ quoteId: latestQuote.id, status, clientComment });

    if (error) {
      console.error("QUOTE STATUS ERROR:", error);
      setErrorMessage("Le statut du devis n’a pas pu être mis à jour.");
    } else {
      setIsRefusing(false);
      setClientComment("");
      await loadQuotes();
    }

    setIsSaving(false);
  };

  const handleSendQuote = async () => {
    if (!latestQuote?.id) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setEmailMessage("");

    console.log("Updating quote...");
    const { data, error } = await updateQuoteStatus({ quoteId: latestQuote.id, status: "sent" });

    if (error) {
      console.error("QUOTE SEND STATUS ERROR:", error);
      setErrorMessage("Le devis n’a pas pu être publié pour le moment.");
      setIsSaving(false);
      return;
    }

    console.log("Quote updated");
    // Email sending is paused until a professional domain/email is configured.
    // Publishing the quote makes it visible in the client dashboard.
    setEmailMessage("Le devis est disponible dans l'espace client.");

    await loadQuotes();
    setIsSaving(false);
    window.setTimeout(() => {
      noticeRef.current?.focus();
      moduleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const handlePdfDownload = () => {
    setPdfErrorMessage("");

    try {
      generateQuotePdf({ request, quote: latestQuote });
    } catch (error) {
      console.error(error);
      setPdfErrorMessage("Impossible de générer le PDF pour le moment. Vérifiez le devis puis réessayez.");
    }
  };

  if (!request?.id) {
    return (
      <div className="quote-placeholder">
        <span>Devis</span>
        <p>Sélectionnez une demande pour consulter les devis.</p>
      </div>
    );
  }

  return (
    <section className="quotes-module" ref={moduleRef}>
      <div className="quotes-heading">
        <div>
          <span>Devis</span>
          <h3>{role === "admin" ? "Gestion commerciale" : "Proposition commerciale"}</h3>
        </div>
        {role === "admin" && mode === "view" && (
          <button className="btn btn-primary" type="button" onClick={startCreate}>
            Créer un devis
          </button>
        )}
      </div>

      {isLoading && <p className="quote-empty">Chargement des devis...</p>}
      {errorMessage && <p className="quote-error">{errorMessage}</p>}
      {emailMessage && (
        <p className="quote-success" role="status" tabIndex={-1} ref={noticeRef}>
          {emailMessage}
        </p>
      )}
      {pdfErrorMessage && <p className="quote-error">{pdfErrorMessage}</p>}

      {!isLoading && mode !== "view" && (
        <QuoteForm
          formRef={formRef}
          initialValues={buildInitialValues()}
          isSaving={isSaving}
          mode={mode}
          onCancel={() => {
            setMode("view");
            setEditingQuote(null);
          }}
          onSubmit={handleSubmit}
        />
      )}

      {!isLoading && mode === "view" && latestQuote && (
        <>
          <QuoteView
            isSaving={isSaving}
            isRefusing={isRefusing}
            clientComment={clientComment}
            quote={latestQuote}
            request={request}
            role={role}
            onClientCommentChange={setClientComment}
            onDuplicate={startDuplicate}
            onEdit={startEdit}
            onPdfDownload={handlePdfDownload}
            onRefuseCancel={() => {
              setIsRefusing(false);
              setClientComment("");
            }}
            onRefuseStart={() => setIsRefusing(true)}
            onSendQuote={handleSendQuote}
            onStatusChange={handleStatusChange}
          />
          {visibleQuotes.length > 1 && (
            <div className="quote-versions">
              <span>Versions précédentes</span>
              {visibleQuotes.slice(1).map((quote) => (
                <div key={quote.id}>
                  <strong>{getQuoteReference(request, quote)}</strong>
                  <QuoteStatusBadge status={quote.status} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!isLoading && mode === "view" && !latestQuote && (
        <div className="quote-placeholder">
          <span>Devis</span>
          <p>Aucun devis généré pour le moment.</p>
          {role === "admin" && (
            <button className="btn btn-secondary" type="button" onClick={startCreate}>
              Créer un devis
            </button>
          )}
        </div>
      )}
    </section>
  );
}
