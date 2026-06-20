import "./DesignSystemPage.css";

const brandColors = [
  { value: "#07030F", label: "Main background" },
  { value: "#0F0A1C", label: "Surface" },
  { value: "#141022", label: "Card" },
  { value: "#8B5CF6", label: "Primary accent" },
  { value: "#A855F7", label: "Secondary accent" },
  { value: "#FFFFFF", label: "Main text" },
  { value: "rgba(255,255,255,0.78)", label: "Secondary text" },
  { value: "rgba(255,255,255,0.08)", label: "Border" },
];

const tags = ["WordPress", "React", "Supabase", "SEO", "Automatisation", "IA", "MVP", "Dashboard"];

const cardExamples = [
  {
    eyebrow: "Service card",
    title: "Création web & automatisation",
    text: "Une présence fiable et des outils pensés pour fluidifier votre activité.",
  },
  {
    eyebrow: "Impact card",
    title: "Moins de tâches répétitives",
    text: "Le quotidien devient plus lisible, avec des étapes mieux organisées.",
  },
  {
    eyebrow: "Project card",
    title: "Espace client sur mesure",
    text: "Un parcours clair pour centraliser les demandes, documents et échanges.",
  },
];

const backgroundPreviews = [
  { title: "Purple radial glow", className: "is-purple-glow" },
  { title: "Dark premium background", className: "is-dark-premium" },
  { title: "Gradient hero background", className: "is-hero-gradient" },
];

const glowLibrary = [
  {
    title: "Hero Glow XL",
    size: "1600 × 900 px",
    className: "is-hero-xl",
  },
  {
    title: "Hero Glow Medium",
    size: "900 × 520 px",
    className: "is-hero-medium",
  },
  {
    title: "Card Glow",
    size: "520 × 360 px",
    className: "is-card-glow",
  },
  {
    title: "Button Glow",
    size: "420 × 180 px",
    className: "is-button-glow",
  },
  {
    title: "Background Ambient Glow",
    size: "1920 × 1080 px",
    className: "is-ambient-glow",
  },
];

const socialAssets = [
  {
    title: "LinkedIn carousel cover",
    className: "is-linkedin",
    text: "Transformons vos idées en solutions digitales.",
  },
  {
    title: "Instagram carousel cover",
    className: "is-instagram",
    text: "Votre projet mérite mieux qu’un simple site.",
  },
  {
    title: "Story/Reel cover",
    className: "is-story",
    text: "Le numérique doit simplifier le travail, pas le compliquer.",
  },
];

const exportAssets = [
  { title: "Logo badge", className: "is-logo-badge" },
  { title: "Primary button", className: "is-button" },
  { title: "CTA card", className: "is-cta-card" },
  { title: "Quote card", className: "is-quote-card" },
  { title: "Service card", className: "is-service-card" },
  { title: "Glow background", className: "is-glow-background" },
];

function DesignSystemSection({ eyebrow, title, children }) {
  return (
    <section className="design-system-section">
      <div className="design-system-section-heading">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function BrandMark() {
  return (
    <div className="design-system-brand-mark">
      <img src="/logo-digital-lab.png" alt="" />
      <span>Digital Lab</span>
    </div>
  );
}

export function DesignSystemPage() {
  return (
    <main className="design-system-page">
      <div className="design-system-shell">
        <header className="design-system-header">
          <BrandMark />
          <div>
            <p className="design-system-kicker">Internal library</p>
            <h1>Design System & Brand Assets</h1>
            <p>
              Internal visual library for Digital Lab social media, presentations and brand materials.
            </p>
          </div>
        </header>

        <DesignSystemSection eyebrow="Palette" title="Brand colors">
          <div className="design-system-color-grid">
            {brandColors.map((color) => (
              <article className="design-system-color-card" key={color.value}>
                <span className="design-system-swatch" style={{ background: color.value }}></span>
                <strong>{color.value}</strong>
                <p>{color.label}</p>
              </article>
            ))}
          </div>
        </DesignSystemSection>

        <DesignSystemSection eyebrow="Type scale" title="Typography">
          <div className="design-system-type-card">
            <div>
              <span>H1</span>
              <h2>Transformons vos idées en solutions digitales.</h2>
            </div>
            <div>
              <span>H2</span>
              <h3>Des solutions conçues pour votre activité.</h3>
            </div>
            <div>
              <span>Body</span>
              <p>Chaque projet commence par une idée.</p>
            </div>
            <div>
              <span>Caption</span>
              <small>Studio digital indépendant</small>
            </div>
          </div>
        </DesignSystemSection>

        <DesignSystemSection eyebrow="Actions" title="Buttons">
          <div className="design-system-actions">
            <a className="btn btn-primary" href="/#contact">
              Parler de mon projet
            </a>
            <a className="btn btn-secondary" href="/#projets">
              Voir les projets
            </a>
            <span className="design-system-pill">Studio digital pour entrepreneurs</span>
          </div>
        </DesignSystemSection>

        <DesignSystemSection eyebrow="Reusable surfaces" title="Cards">
          <div className="design-system-card-grid">
            {cardExamples.map((card) => (
              <article className="glass-card design-system-example-card" key={card.eyebrow}>
                <div className="service-icon" aria-hidden="true"></div>
                <span>{card.eyebrow}</span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </DesignSystemSection>

        <DesignSystemSection eyebrow="Metadata" title="Badges / Tags">
          <div className="design-system-tags">
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </DesignSystemSection>

        <DesignSystemSection eyebrow="Atmosphere" title="Glow & Backgrounds">
          <div className="design-system-preview-grid">
            {backgroundPreviews.map((preview) => (
              <article className={`design-system-background-preview ${preview.className}`} key={preview.title}>
                <span>{preview.title}</span>
              </article>
            ))}
          </div>
        </DesignSystemSection>

        <DesignSystemSection eyebrow="Export backgrounds" title="Glow Library">
          <div className="design-system-glow-grid">
            {glowLibrary.map((glow) => (
              <article className="design-system-glow-card" key={glow.title}>
                <div className={`design-system-glow-preview ${glow.className}`} aria-hidden="true"></div>
                <div>
                  <h3>{glow.title}</h3>
                  <p>{glow.size}</p>
                </div>
              </article>
            ))}
          </div>
        </DesignSystemSection>

        <DesignSystemSection eyebrow="Social" title="Social media assets">
          <div className="design-system-social-grid">
            {socialAssets.map((asset) => (
              <article className={`design-system-social-preview ${asset.className}`} key={asset.title}>
                <span>{asset.title}</span>
                <h3>{asset.text}</h3>
                <BrandMark />
              </article>
            ))}
          </div>
        </DesignSystemSection>

        <DesignSystemSection eyebrow="Canva kit" title="Assets to export for Canva">
          <div className="design-system-export-grid">
            {exportAssets.map((asset) => (
              <article className={`design-system-export-card ${asset.className}`} key={asset.title}>
                <div className="design-system-export-preview">
                  {asset.className === "is-logo-badge" && <BrandMark />}
                  {asset.className === "is-button" && <span className="design-system-button-preview">Parler de mon projet</span>}
                  {asset.className === "is-cta-card" && <h3>Votre projet mérite mieux qu’un simple site.</h3>}
                  {asset.className === "is-quote-card" && <p>“Une solution professionnelle pensée pour durer.”</p>}
                  {asset.className === "is-service-card" && (
                    <>
                      <div className="service-icon" aria-hidden="true"></div>
                      <h3>Automatisation</h3>
                    </>
                  )}
                  {asset.className === "is-glow-background" && <span></span>}
                </div>
                <strong>{asset.title}</strong>
              </article>
            ))}
          </div>
        </DesignSystemSection>
      </div>
    </main>
  );
}
