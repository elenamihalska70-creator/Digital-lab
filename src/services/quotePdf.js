import jsPDF from "jspdf";

const violet = [111, 61, 255];
const deepText = [24, 16, 36];
const mutedText = [91, 82, 111];
const softBorder = [226, 218, 248];
const softBg = [248, 245, 255];

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

export const getQuoteReference = (request, quote) =>
  `${request?.reference || "DL-2026-0000"}-V${quote?.version || 1}`;

export const getQuotePdfFileName = (request, quote) =>
  `devis-digital-lab-${getQuoteReference(request, quote)}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "-");

const drawTextBlock = (doc, text, x, y, maxWidth, lineHeight = 6) => {
  const lines = doc.splitTextToSize(text || "À définir", maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
};

const drawCard = (doc, { x, y, w, h, title, lines }) => {
  doc.setDrawColor(...softBorder);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 4, 4, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...violet);
  doc.text(title, x + 5, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...deepText);
  lines.filter(Boolean).forEach((line, index) => {
    doc.text(String(line), x + 5, y + 16 + index * 6);
  });
};

export const generateQuotePdf = ({ request, quote }) => {
  if (!quote) {
    throw new Error("Aucun devis disponible pour générer le PDF.");
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const quoteReference = getQuoteReference(request, quote);

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setFillColor(...violet);
  doc.roundedRect(margin, 16, 18, 18, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DL", margin + 5.2, 27.5);

  doc.setTextColor(...deepText);
  doc.setFontSize(20);
  doc.text("Digital Lab", margin + 24, 23);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...mutedText);
  doc.text("Solutions web, automatisation et outils digitaux", margin + 24, 29);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...deepText);
  doc.text("DEVIS", pageWidth - margin, 24, { align: "right" });
  doc.setFontSize(10);
  doc.setTextColor(...violet);
  doc.text(quoteReference, pageWidth - margin, 31, { align: "right" });

  doc.setDrawColor(...violet);
  doc.setLineWidth(0.8);
  doc.line(margin, 40, pageWidth - margin, 40);

  drawCard(doc, {
    x: margin,
    y: 48,
    w: 82,
    h: 36,
    title: "Client",
    lines: [request?.name || "Client", request?.email || "", request?.company || ""],
  });

  drawCard(doc, {
    x: pageWidth - margin - 82,
    y: 48,
    w: 82,
    h: 36,
    title: "Informations",
    lines: [`Date : ${formatDate(quote.created_at)}`, `Validité : ${formatDate(quote.valid_until)}`],
  });

  let y = 98;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...violet);
  doc.text("Projet", margin, y);
  doc.setFontSize(17);
  doc.setTextColor(...deepText);
  doc.text(quote.title || request?.project_type || "Projet Digital Lab", margin, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...mutedText);
  y = drawTextBlock(doc, quote.description || request?.message || "Description à préciser.", margin, y + 19, pageWidth - margin * 2, 5.5) + 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...violet);
  doc.text("Tableau des prix", margin, y);
  y += 8;

  const tableX = margin;
  const tableW = pageWidth - margin * 2;
  const rowH = 11;
  const priceRows = [
    ["Prix HT", formatMoney(quote.price_ht)],
    [`TVA (${quote.vat || 0}%)`, formatMoney((Number(quote.price_ttc) || 0) - (Number(quote.price_ht) || 0))],
    ["Total TTC", formatMoney(quote.price_ttc)],
    [`Acompte (${quote.deposit_percent || 0}%)`, formatMoney(quote.deposit_amount)],
    ["Solde restant", formatMoney(quote.remaining_amount)],
  ];

  doc.setFillColor(...softBg);
  doc.setDrawColor(...softBorder);
  doc.roundedRect(tableX, y, tableW, rowH, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...deepText);
  doc.text("Élément", tableX + 5, y + 7);
  doc.text("Montant", tableX + tableW - 5, y + 7, { align: "right" });
  y += rowH;

  priceRows.forEach(([label, amount], index) => {
    doc.setFillColor(index === 2 ? 247 : 255, index === 2 ? 243 : 255, 255);
    doc.rect(tableX, y, tableW, rowH, "F");
    doc.setDrawColor(...softBorder);
    doc.line(tableX, y + rowH, tableX + tableW, y + rowH);
    doc.setFont("helvetica", index === 2 ? "bold" : "normal");
    doc.setTextColor(...deepText);
    doc.text(label, tableX + 5, y + 7);
    doc.text(amount, tableX + tableW - 5, y + 7, { align: "right" });
    y += rowH;
  });

  y += 12;
  drawCard(doc, {
    x: margin,
    y,
    w: 82,
    h: 32,
    title: "Délai estimé",
    lines: [quote.estimated_delay || "À définir"],
  });
  drawCard(doc, {
    x: pageWidth - margin - 82,
    y,
    w: 82,
    h: 32,
    title: "Conditions de paiement",
    lines: doc.splitTextToSize(quote.payment_terms || "À définir", 70),
  });

  y += 46;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...violet);
  doc.text("Signature", margin, y);
  y += 8;
  doc.setDrawColor(184, 167, 232);
  doc.roundedRect(margin, y, 78, 26, 4, 4);
  doc.roundedRect(pageWidth - margin - 78, y, 78, 26, 4, 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...mutedText);
  doc.text("Digital Lab", margin + 5, y + 8);
  doc.text("Client - Bon pour accord", pageWidth - margin - 73, y + 8);

  doc.setDrawColor(...softBorder);
  doc.line(margin, pageHeight - 24, pageWidth - margin, pageHeight - 24);
  doc.setFontSize(8.5);
  doc.setTextColor(...mutedText);
  doc.text("Digital Lab — Olena Mykhalska", margin, pageHeight - 17);
  doc.text("Belfort, France", margin, pageHeight - 12);
  doc.text("SIRET: 10575928600013", pageWidth - margin, pageHeight - 12, { align: "right" });

  doc.save(getQuotePdfFileName(request, quote));
};
