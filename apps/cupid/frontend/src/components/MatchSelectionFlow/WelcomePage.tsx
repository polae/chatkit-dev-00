import { User, MapPin, ArrowRight } from "lucide-react";
import type { PersonData } from "../../types/today";
import { getZodiacSymbol, getZodiacName } from "../../types/today";

interface WelcomePageProps {
  mortal: PersonData;
  onNext: () => void;
}

export function WelcomePage({ mortal, onNext }: WelcomePageProps) {
  const astro = mortal.astrological_reference;

  return (
    <>
      <div className="ms-page-wrapper">
        {/* Hero Section */}
        <section className="ms-hero">
          <h1 className="ms-hero-title">Welcome to Cupid</h1>
          <p className="ms-hero-subtitle">
            An interactive rom-com where you play matchmaker for today's mortal.
          </p>
        </section>

        {/* Today's Mortal */}
        <p className="ms-section-label">Today's Mortal</p>
        <article className="ms-mortal-card">
          <div className="ms-mortal-header">
            <div className="ms-mortal-avatar">
              <User />
            </div>
            <div className="ms-mortal-info">
              <h2 className="ms-mortal-name">{mortal.name}</h2>
              <p className="ms-mortal-details">
                {mortal.occupation}, {mortal.age}
              </p>
              <p className="ms-mortal-location">
                <MapPin />
                {mortal.location}
              </p>
            </div>
          </div>
          <p className="ms-mortal-bio">{mortal.bio}</p>
          <div className="ms-zodiac-badges">
            <span className="ms-zodiac-badge">
              ☀️ {getZodiacName(astro.sun)}
            </span>
            <span className="ms-zodiac-badge">
              🌙 {getZodiacName(astro.moon)}
            </span>
            <span className="ms-zodiac-badge">
              💖 {getZodiacName(astro.venus)}
            </span>
            <span className="ms-zodiac-badge">
              🔥 {getZodiacName(astro.mars)}
            </span>
          </div>
        </article>

        {/* Navigation */}
        <button className="ms-nav-button" onClick={onNext}>
          Choose a Match
          <ArrowRight />
        </button>
      </div>
    </>
  );
}
