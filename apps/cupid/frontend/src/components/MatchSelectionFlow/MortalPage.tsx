import { User, MapPin, ArrowLeft, ArrowRight } from "lucide-react";
import type { PersonData } from "../../types/today";
import { getZodiacName } from "../../types/today";
import { TopProgressBar } from "./TopProgressBar";
import { formatAge } from "../../lib/format";

interface MortalPageProps {
  mortal: PersonData;
  onBack: () => void;
  onNext: () => void;
}

export function MortalPage({ mortal, onBack, onNext }: MortalPageProps) {
  const astro = mortal.astrological_reference;

  return (
    <>
      <div className="ms-page-wrapper">
        <TopProgressBar step={1} />

        {/* Header with back button */}
        <div className="flex items-center gap-3 w-full mb-4">
          <button className="ms-back-button" onClick={onBack} aria-label="Back">
            <ArrowLeft />
          </button>
          <div className="flex-1">
            <h1 className="ms-section-title" style={{ textAlign: "left" }}>
              Meet Today's Mortal
            </h1>
            <p
              className="ms-section-subtitle"
              style={{ textAlign: "left", marginTop: 4 }}
            >
              Your matchmaking begins here
            </p>
          </div>
        </div>

        {/* Mortal Card */}
        <article className="ms-mortal-card">
          <div className="ms-mortal-header">
            <div className="ms-mortal-avatar">
              <User />
            </div>
            <div className="ms-mortal-info">
              <h2 className="ms-mortal-name">{mortal.name}</h2>
              <p className="ms-mortal-details">
                {mortal.occupation}, {formatAge(mortal.age)}
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
      </div>

      {/* Navigation */}
      <section className="ms-nav-section">
        <button className="ms-nav-button" onClick={onNext}>
          Choose a Match
          <ArrowRight />
        </button>
      </section>
    </>
  );
}
