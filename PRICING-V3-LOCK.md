# Public website pricing V3 - DL-PRICING-V3-03

Integration candidate from production b083723248ecf9bd72999cad35b37192ab18841c. No commit or publication is authorized by this document.

The runtime source for website packages is src/utils/websitePricing.js: one page 390 EUR, up to 3 pages 590 EUR, up to 5 pages 890 EUR. Responsive layout, basic SEO, a simple contact form and minor adaptation of supplied content are included. Partial content covers minor adaptation only, not writing missing content. Creation from scratch adds 300 EUR. Advanced scope adds 650 EUR; selected complex features use the existing estimator feature table and are additional. Standard scope does not bill page count twice. Larger sites require a bespoke quote.

Website urgency: Normal x1, Rapide x1.1, Urgent x1.2, with one final upward rounding to a whole euro. Included/repeated website features never add price, days or complexity. Other one-off services keep production content surcharges, urgency, feature handling and 50 EUR rounding. Monthly Social Media/Reels billing is separate, including first-month totals. Tax formatting and mailto fallback stay in the existing production modules.

Changing prices, inclusions, coefficients, rounding, or expected checksums requires a separate LOT and explicit owner approval. There is no command to regenerate this lock automatically. Do not rewrite the manifest to make CI pass. The manifest pins the website config and complete estimator (including unchanged Social Media/Reels), plus preserved tax and mailto/release modules. Hashes normalize CRLF/LF.

A checksum detects accidental drift; someone who can change both code and the manifest can bypass it. Regression tests also pin approved amounts and production compatibility outputs. Mandatory owner review and required CI checks need GitHub branch protection configured separately; no such settings are changed by this LOT. The unchanged TVA release gate runs before pricing checks.
