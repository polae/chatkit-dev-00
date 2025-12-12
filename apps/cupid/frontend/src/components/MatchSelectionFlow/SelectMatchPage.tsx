import { useState } from "react";
import { User, MapPin, ArrowLeft, ArrowRight } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import type { PersonData, MatchEntry, CompatibilityData } from "../../types/today";
import { getZodiacName } from "../../types/today";
import { CompatibilityBars } from "./CompatibilityBars";

interface SelectMatchPageProps {
  mortal: PersonData;
  matches: MatchEntry[];
  compatibility: Record<string, CompatibilityData>;
  onBack: () => void;
  onNext: () => void;
}

const AVATAR_COLORS: Record<number, string> = {
  0: "var(--ms-blue)",
  1: "var(--ms-orange)",
  2: "var(--ms-green)",
};

export function SelectMatchPage({
  mortal,
  matches,
  compatibility,
  onBack,
  onNext,
}: SelectMatchPageProps) {
  const setSelectedMatchId = useAppStore((state) => state.setSelectedMatchId);

  // Track which card is flipped (showing compatibility)
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);

  const handleCardClick = (matchId: string) => {
    if (flippedCardId === matchId) {
      // Same card clicked - flip back, deselect
      setFlippedCardId(null);
      setSelectedMatchId(null);
    } else {
      // Different card clicked - auto-switch: flip this one, select it
      setFlippedCardId(matchId);
      setSelectedMatchId(matchId);
    }
  };

  const getTierClass = (tier: string) => {
    const lower = tier.toLowerCase();
    if (lower === "excellent") return "excellent";
    if (lower === "good") return "good";
    return "moderate";
  };

  // Button is enabled only when a card is flipped (selected)
  const canProceed = flippedCardId !== null;

  return (
    <>
      <div className="ms-page-wrapper">
        {/* Header with back button */}
        <div className="flex items-center gap-3 w-full mb-4">
          <button className="ms-back-button" onClick={onBack} aria-label="Back">
            <ArrowLeft />
          </button>
          <div className="flex-1">
            <h1 className="ms-section-title" style={{ textAlign: "left" }}>
              Choose a Match for {mortal.name.split(" ")[0]}
            </h1>
          </div>
        </div>

        {/* Match Cards with Flip */}
        <div className="ms-matches-grid">
          {matches.map((match, index) => {
            const person = match.data;
            const astro = person.astrological_reference;
            const isFlipped = flippedCardId === match.id;
            const matchCompat = compatibility[match.id];

            return (
              <div
                key={match.id}
                className="ms-flip-card-container"
                style={{ animationDelay: `${150 + index * 50}ms` }}
              >
                <div
                  className={`ms-flip-card-inner ${isFlipped ? "flipped" : ""}`}
                  onClick={() => handleCardClick(match.id)}
                >
                  {/* Front: Profile Card */}
                  <article className="ms-flip-card-front ms-match-card">
                    <div
                      className="ms-match-avatar"
                      style={{ background: AVATAR_COLORS[index] }}
                    >
                      <User />
                    </div>
                    <div className="ms-match-info">
                      <h3 className="ms-match-name">{person.name}</h3>
                      <p className="ms-match-details">
                        {person.occupation}, {person.age}
                      </p>
                      <p className="ms-match-location">
                        <MapPin />
                        {person.location}
                      </p>
                      <div className="ms-match-zodiac">
                        <span className="ms-match-zodiac-badge">
                          ☀️ {getZodiacName(astro.sun)}
                        </span>
                        <span className="ms-match-zodiac-badge">
                          🌙 {getZodiacName(astro.moon)}
                        </span>
                        <span className="ms-match-zodiac-badge">
                          💖 {getZodiacName(astro.venus)}
                        </span>
                        <span className="ms-match-zodiac-badge">
                          🔥 {getZodiacName(astro.mars)}
                        </span>
                      </div>
                    </div>
                  </article>

                  {/* Back: Compatibility Card */}
                  <article className="ms-flip-card-back ms-compat-card">
                    <div className="ms-compat-card-header">
                      <div>
                        <h3 className="ms-compatibility-title">
                          {mortal.name.split(" ")[0]} &{" "}
                          {person.name.split(" ")[0]}
                        </h3>
                        <p className="ms-compatibility-subtitle">Compatibility</p>
                      </div>
                      <div className="ms-compatibility-score">
                        <div className="ms-compatibility-score-value">
                          {matchCompat.overall_compatibility}
                        </div>
                        <span
                          className={`ms-compatibility-tier ${getTierClass(
                            matchCompat.compatibility_tier
                          )}`}
                        >
                          {matchCompat.compatibility_tier}
                        </span>
                      </div>
                    </div>
                    <CompatibilityBars
                      compatibility={matchCompat}
                      mortalAstro={mortal.astrological_reference}
                      matchAstro={astro}
                      animate={isFlipped}
                    />
                  </article>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step Indicator */}
        <div className="ms-step-indicator">
          <span className="ms-step-dot completed" />
          <span className="ms-step-dot completed" />
          <span className="ms-step-dot active" />
          <span className="ms-step-dot" />
        </div>
      </div>

      {/* Navigation */}
      <section className="ms-nav-section">
        <button
          className="ms-nav-button"
          disabled={!canProceed}
          onClick={onNext}
        >
          Select {flippedCardId ? matches.find(m => m.id === flippedCardId)?.data.name.split(" ")[0] : ""}
          <ArrowRight />
        </button>
      </section>
    </>
  );
}
