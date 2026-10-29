import { useEffect, useRef, useState } from "react";
import "./AILabCarousel.css";

const motionQuery = "(prefers-reduced-motion: reduce)";

export function AILabCarousel({ images, name, isEnglish = false }) {
  const rootRef = useRef(null);
  const [slide, setSlide] = useState({ index: 0, loaded: [0] });
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(motionQuery).matches,
  );

  const select = (index) => setSlide((previous) => {
    const next = (index + images.length) % images.length;
    return { index: next, loaded: [...new Set([...previous.loaded, next])] };
  });

  useEffect(() => {
    const media = window.matchMedia(motionQuery);
    const change = () => setReducedMotion(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (paused || hovered || focused || reducedMotion || !visible) return undefined;
    const timer = window.setInterval(() => setSlide((previous) => {
      const next = (previous.index + 1) % images.length;
      return { index: next, loaded: [...new Set([...previous.loaded, next])] };
    }), 5000);
    return () => window.clearInterval(timer);
  }, [paused, hovered, focused, reducedMotion, visible, images.length]);

  const label = isEnglish ? "Concept illustrations" : "Illustrations conceptuelles";

  return (
    <figure
      ref={rootRef}
      className="ai-lab-visual ai-lab-carousel"
      data-reduced-motion={reducedMotion}
      role="region"
      aria-roledescription={isEnglish ? "carousel" : "carrousel"}
      aria-label={`${name} — ${label}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          select(slide.index + (event.key === "ArrowLeft" ? -1 : 1));
        } else if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          select(event.key === "Home" ? 0 : images.length - 1);
        }
      }}
    >
      <div className="ai-lab-carousel-slides" aria-live={focused || paused ? "polite" : "off"}>
        {images.map((image, index) => (
          <div key={image} className={`ai-lab-carousel-slide${index === slide.index ? " is-active" : ""}`}
            aria-hidden={index !== slide.index} role="group"
            aria-label={isEnglish ? `Image ${index + 1} of ${images.length}` : `Image ${index + 1} sur ${images.length}`}>
            <img src={slide.loaded.includes(index) ? image : undefined}
              alt={`${name} — ${label}, ${index + 1}/${images.length}`}
              width="1600" height="900" loading={index === 0 ? "eager" : "lazy"} decoding="async" />
          </div>
        ))}
      </div>
      <button type="button" className="ai-lab-carousel-arrow is-previous" onClick={() => select(slide.index - 1)}
        aria-label={isEnglish ? "Previous illustration" : "Illustration précédente"}>‹</button>
      <button type="button" className="ai-lab-carousel-arrow is-next" onClick={() => select(slide.index + 1)}
        aria-label={isEnglish ? "Next illustration" : "Illustration suivante"}>›</button>
      <div className="ai-lab-carousel-dots" role="group" aria-label={isEnglish ? "Choose an illustration" : "Choisir une illustration"}>
        {images.map((image, index) => (
          <button key={image} type="button" aria-current={slide.index === index ? "true" : undefined}
            aria-label={isEnglish ? `Show illustration ${index + 1}` : `Afficher l’illustration ${index + 1}`}
            onClick={() => select(index)}><span /></button>
        ))}
      </div>
      <button type="button" className="ai-lab-carousel-pause" disabled={reducedMotion}
        aria-label={reducedMotion
          ? (isEnglish ? "Automatic playback disabled: reduced motion" : "Défilement automatique désactivé : mouvements réduits")
          : paused ? (isEnglish ? "Resume slideshow" : "Reprendre le défilement") : (isEnglish ? "Pause slideshow" : "Suspendre le défilement")}
        aria-pressed={paused} onClick={() => setPaused((value) => !value)}>
        <span aria-hidden="true">{paused || reducedMotion ? "▶" : "Ⅱ"}</span>
      </button>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
