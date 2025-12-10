import { User, MapPin, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import type { PersonData, MatchEntry, CompatibilityData } from "../../types/today";
import { getZodiacSymbol, getZodiacName } from "../../types/today";
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
  const selectedMatchId = useAppStore((state) => state.selectedMatchId);
  const setSelectedMatchId = useAppStore((state) => state.setSelectedMatchId);

  const selectedMatch = selectedMatchId
    ? matches.find((m) => m.id === selectedMatchId)
    : null;
  const selectedCompatibility = selectedMatchId
    ? compatibility[selectedMatchId]
    : null;

  const getTierClass = (tier: string) => {
    const lower = tier.toLowerCase();
    if (lower === "excellent") return "excellent";
    if (lower === "good") return "good";
    return "moderate";
  };

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
            <p
              className="ms-section-subtitle"
              style={{ textAlign: "left", marginTop: 4 }}
            >
              Select one of the three potential matches
            </p>
          </div>
        </div>

        {/* Match Cards */}
        <div className="ms-matches-grid">
          {matches.map((match, index) => {
            const person = match.data;
            const astro = person.astrological_reference;
            const isSelected = selectedMatchId === match.id;

            return (
              <article
                key={match.id}
                className={`ms-match-card ${isSelected ? "selected" : ""}`}
                onClick={() => setSelectedMatchId(match.id)}
                style={{ animationDelay: `${150 + index * 50}ms` }}
              >
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
                <div className="ms-match-check">
                  <Check />
                </div>
              </article>
            );
          })}
        </div>

        {/* Compatibility Section (shows when selected) */}
        <section
          className={`ms-compatibility-section ${
            selectedMatch ? "visible" : ""
          }`}
        >
          {selectedMatch && selectedCompatibility && (
            <div className="ms-compatibility-card">
              <div className="ms-compatibility-header">
                <div>
                  <h3 className="ms-compatibility-title">
                    {mortal.name.split(" ")[0]} &{" "}
                    {selectedMatch.data.name.split(" ")[0]}
                  </h3>
                  <p className="ms-compatibility-subtitle">Compatibility</p>
                </div>
                <div className="ms-compatibility-score">
                  <div className="ms-compatibility-score-value">
                    {selectedCompatibility.overall_compatibility}
                  </div>
                  <span
                    className={`ms-compatibility-tier ${getTierClass(
                      selectedCompatibility.compatibility_tier
                    )}`}
                  >
                    {selectedCompatibility.compatibility_tier}
                  </span>
                </div>
              </div>
              <CompatibilityBars
                compatibility={selectedCompatibility}
                mortalAstro={mortal.astrological_reference}
                matchAstro={selectedMatch.data.astrological_reference}
                animate={true}
              />
            </div>
          )}
        </section>

        {/* Step Indicator */}
        <div className="ms-step-indicator">
          <span className="ms-step-dot completed" />
          <span className="ms-step-dot active" />
          <span className="ms-step-dot" />
        </div>
      </div>

      {/* Navigation */}
      <section className="ms-nav-section">
        <button
          className="ms-nav-button"
          disabled={!selectedMatchId}
          onClick={onNext}
        >
          Continue
          <ArrowRight />
        </button>
      </section>
    </>
  );
}
