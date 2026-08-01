import "./DesignSystemPage.css";

const brandColors = [
  { value: "#07030F", label: "Fond principal" },
  { value: "#0F0A1C", label: "Surface" },
  { value: "#141022", label: "Carte" },
  { value: "#8B5CF6", label: "Accent principal" },
  { value: "#A855F7", label: "Accent secondaire" },
  { value: "#FFFFFF", label: "Texte principal" },
  { value: "rgba(255,255,255,0.78)", label: "Texte secondaire" },
  { value: "rgba(255,255,255,0.08)", label: "Bordure" },
];

const tags = ["WordPress", "React", "Supabase", "SEO", "Automatisation", "IA", "MVP", "Tableau de bord"];

const cardExamples = [
  {
    eyebrow: "Carte service",
    title: "Création web & automatisation",
    text: "Une présence fiable et des outils pensés pour fluidifier votre activité.",
  },
  {
    eyebrow: "Carte impact",
    title: "Moins de tâches répétitives",
    text: "Le quotidien devient plus lisible, avec des étapes mieux organisées.",
  },
  {
    eyebrow: "Carte projet",
    title: "Espace client sur mesure",
    text: "Un parcours clair pour centraliser les demandes, documents et échanges.",
  },
];

const backgroundPreviews = [
  { title: "Halo radial violet", className: "is-purple-glow" },
  { title: "Fond premium sombre", className: "is-dark-premium" },
  { title: "Fond hero dégradé", className: "is-hero-gradient" },
];

const glowLibrary = [
  {
    title: "Halo hero XL",
    size: "1600 × 900 px",
    className: "is-hero-xl",
  },
  {
    title: "Halo hero moyen",
    size: "900 × 520 px",
    className: "is-hero-medium",
  },
  {
    title: "Halo de carte",
    size: "520 × 360 px",
    className: "is-card-glow",
  },
  {
    title: "Halo de bouton",
    size: "420 × 180 px",
    className: "is-button-glow",
  },
  {
    title: "Halo d’ambiance",
    size: "1920 × 1080 px",
    className: "is-ambient-glow",
  },
];

const socialAssets = [
  {
    title: "Couverture carrousel LinkedIn",
    className: "is-linkedin",
    text: "Transformons vos idées en solutions digitales.",
  },
  {
    title: "Couverture carrousel Instagram",
    className: "is-instagram",
    text: "Votre projet mérite mieux qu’un simple site.",
  },
  {
    title: "Couverture story/reel",
    className: "is-story",
    text: "Le numérique doit simplifier le travail, pas le compliquer.",
  },
];

const exportAssets = [
  { title: "Badge logo", className: "is-logo-badge" },
  { title: "Bouton principal", className: "is-button" },
  { title: "Carte CTA", className: "is-cta-card" },
  { title: "Carte citation", className: "is-quote-card" },
  { title: "Carte service", className: "is-service-card" },
  { title: "Fond lumineux", className: "is-glow-background" },
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
            <p className="design-system-kicker">Bibliothèque interne</p>
            <h1>Système de design & ressources de marque</h1>
            <p>
              Bibliothèque visuelle interne pour les réseaux sociaux, présentations et supports de marque Digital Lab.
            </p>
          </div>
        </header>

        <DesignSystemSection eyebrow="Palette" title="Couleurs de marque">
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

        <DesignSystemSection eyebrow="Échelle typographique" title="Typographie">
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
              <span>Corps</span>
              <p>Chaque projet commence par une idée.</p>
            </div>
            <div>
              <span>Légende</span>
              <small>Studio digital indépendant</small>
            </div>
          </div>
        </DesignSystemSection>

        <DesignSystemSection eyebrow="Actions" title="Boutons">
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

        <DesignSystemSection eyebrow="Surfaces réutilisables" title="Cartes">
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

        <DesignSystemSection eyebrow="Métadonnées" title="Badges / étiquettes">
          <div className="design-system-tags">
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </DesignSystemSection>

        <DesignSystemSection eyebrow="Atmosphère" title="Halos & fonds">
          <div className="design-system-preview-grid">
            {backgroundPreviews.map((preview) => (
              <article className={`design-system-background-preview ${preview.className}`} key={preview.title}>
                <span>{preview.title}</span>
              </article>
            ))}
          </div>
        </DesignSystemSection>

        <DesignSystemSection eyebrow="Fonds exportables" title="Bibliothèque de halos">
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

        <DesignSystemSection eyebrow="Réseaux" title="Ressources réseaux sociaux">
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

        <DesignSystemSection eyebrow="Kit Canva" title="Ressources à exporter pour Canva">
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
