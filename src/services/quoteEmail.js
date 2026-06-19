import { supabase } from "./auth";

// Email sending is paused until a professional domain/email is configured.
// Keep this service for the future Resend/Supabase Edge Function flow, but do not call it from quotes for now.
export const sendQuoteEmail = async ({ quoteId, clientEmail, clientName }) => {
  if (!quoteId || !clientEmail) {
    throw new Error("Email client ou devis manquant.");
  }

  if (!supabase) {
    throw new Error("Supabase n’est pas configuré. Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.");
  }

  console.log("Calling Supabase Edge Function send-quote-email");

  const { data, error } = await supabase.functions.invoke("send-quote-email", {
    body: {
      to: clientEmail,
      clientName: clientName || "",
      quoteTitle: "Devis Digital Lab",
      quoteNumber: quoteId,
      totalTtc: "",
      appUrl: `${window.location.origin}/dashboard`,
    },
  });

  console.log("Email function response", data);

  if (error || data?.ok === false) {
    const emailError = new Error(data?.error || error?.message || "L’email n’a pas pu être envoyé.");
    console.error("Email function error", emailError);
    throw emailError;
  }

  return data;
};
