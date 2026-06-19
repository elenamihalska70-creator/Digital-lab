import { supabase } from "./auth";

export const QUOTE_STATUSES = ["draft", "sent", "accepted", "refused", "expired"];

const getMissingConfigError = () => ({
  data: null,
  error: new Error("Supabase n’est pas configuré. Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY."),
});

export const calculateQuoteAmounts = ({ priceHt = 0, vat = 20, depositPercent = 30 }) => {
  const normalizedPriceHt = Number(priceHt) || 0;
  const normalizedVat = Number(vat) || 0;
  const normalizedDepositPercent = Number(depositPercent) || 0;
  const priceTtc = normalizedPriceHt * (1 + normalizedVat / 100);
  const depositAmount = priceTtc * (normalizedDepositPercent / 100);
  const remainingAmount = priceTtc - depositAmount;

  return {
    price_ttc: Number(priceTtc.toFixed(2)),
    deposit_amount: Number(depositAmount.toFixed(2)),
    remaining_amount: Number(remainingAmount.toFixed(2)),
  };
};

export const getQuotesForRequest = async (requestId) => {
  if (!supabase) {
    return getMissingConfigError();
  }

  if (!requestId) {
    return { data: [], error: null };
  }

  return supabase
    .from("quotes")
    .select("*")
    .eq("request_id", requestId)
    .order("version", { ascending: false })
    .order("created_at", { ascending: false });
};

export const getLatestQuotesForRequests = async (requestIds) => {
  if (!supabase) {
    return getMissingConfigError();
  }

  if (!requestIds?.length) {
    return { data: {}, error: null };
  }

  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .in("request_id", requestIds)
    .order("version", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return { data: {}, error };
  }

  const latestQuotes = {};

  (data ?? []).forEach((quote) => {
    if (!latestQuotes[quote.request_id]) {
      latestQuotes[quote.request_id] = quote;
    }
  });

  return { data: latestQuotes, error: null };
};

export const createQuote = async ({ requestId, createdBy, values, latestVersion = 0 }) => {
  if (!supabase) {
    return getMissingConfigError();
  }

  const amounts = calculateQuoteAmounts({
    priceHt: values.price_ht,
    vat: values.vat,
    depositPercent: values.deposit_percent,
  });

  return supabase
    .from("quotes")
    .insert({
      request_id: requestId,
      version: latestVersion + 1,
      title: values.title,
      description: values.description,
      price_ht: Number(values.price_ht) || 0,
      vat: Number(values.vat) || 20,
      deposit_percent: Number(values.deposit_percent) || 0,
      estimated_delay: values.estimated_delay,
      valid_until: values.valid_until || null,
      payment_terms: values.payment_terms,
      status: values.status || "draft",
      created_by: createdBy,
      ...amounts,
    })
    .select("*")
    .single();
};

export const updateQuote = async ({ quoteId, values }) => {
  if (!supabase) {
    return getMissingConfigError();
  }

  const amounts = calculateQuoteAmounts({
    priceHt: values.price_ht,
    vat: values.vat,
    depositPercent: values.deposit_percent,
  });

  return supabase
    .from("quotes")
    .update({
      title: values.title,
      description: values.description,
      price_ht: Number(values.price_ht) || 0,
      vat: Number(values.vat) || 20,
      deposit_percent: Number(values.deposit_percent) || 0,
      estimated_delay: values.estimated_delay,
      valid_until: values.valid_until || null,
      payment_terms: values.payment_terms,
      status: values.status || "draft",
      ...amounts,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteId)
    .select("*")
    .single();
};

export const updateQuoteStatus = async ({ quoteId, status, clientComment = "" }) => {
  if (!supabase) {
    return getMissingConfigError();
  }

  if (!QUOTE_STATUSES.includes(status)) {
    return { data: null, error: new Error("Statut de devis invalide.") };
  }

  const statusPayload = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "accepted") {
    statusPayload.accepted_at = new Date().toISOString();
    statusPayload.refused_at = null;
    statusPayload.client_comment = null;
  }

  if (status === "sent") {
    statusPayload.sent_at = new Date().toISOString();
  }

  if (status === "refused") {
    statusPayload.refused_at = new Date().toISOString();
    statusPayload.accepted_at = null;
    statusPayload.client_comment = clientComment.trim() || null;
  }

  return supabase
    .from("quotes")
    .update(statusPayload)
    .eq("id", quoteId)
    .select("*")
    .single();
};
