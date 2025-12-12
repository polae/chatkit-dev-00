import { useState } from "react";
import { User, ArrowLeft, Play, Heart, Loader2 } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import type { PersonData, CompatibilityData } from "../../types/today";
import { getZodiacSymbol } from "../../types/today";
import { CompatibilityBars } from "./CompatibilityBars";

interface ConfirmPageProps {
  mortal: PersonData;
  match: PersonData;
  compatibility: CompatibilityData;
  onBack: () => void;
}

export function ConfirmPage({
  mortal,
  match,
  compatibility,
  onBack,
}: ConfirmPageProps) {
  const startGame = useAppStore((state) => state.startGame);
  const selectedMatchId = useAppStore((state) => state.selectedMatchId);
  const todayData = useAppStore((state) => state.todayData);
  const setMatchSessionId = useAppStore((state) => state.setMatchSessionId);
  const [isLoading, setIsLoading] = useState(false);

  const getTierClass = (tier: string) => {
    const lower = tier.toLowerCase();
    if (lower === "excellent") return "excellent";
    if (lower === "good") return "good";
    return "moderate";
  };

  const handlePlay = async () => {
    if (!selectedMatchId || !todayData) return;

    setIsLoading(true);
    try {
      // Store match selection on backend and get session ID
      const response = await fetch("/api/match-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mortal_data: todayData.mortal,
          match_data: match,
          compatibility_data: compatibility,
          selected_match_id: selectedMatchId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to store match selection");
      }

      const { session_id } = await response.json();

      // Store session ID in app state - will be passed via header
      setMatchSessionId(session_id);

      // Start the game - ChatKitPanel will send "Play" message
      startGame();
    } catch (error) {
      console.error("Failed to start game:", error);
      setIsLoading(false);
    }
  };

  const mortalAstro = mortal.astrological_reference;
  const matchAstro = match.astrological_reference;

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
              Ready to Play?
            </h1>
            <p
              className="ms-section-subtitle"
              style={{ textAlign: "left", marginTop: 4 }}
            >
              Your match is set for today's game
            </p>
          </div>
        </div>

        {/* Profiles Side by Side */}
        <div className="ms-profiles-row">
          {/* Mortal */}
          <article className="ms-profile-card">
            <div className="ms-profile-avatar" style={{ background: "var(--ms-pink)" }}>
              <User />
            </div>
            <h3 className="ms-profile-name">{mortal.name.split(" ")[0]}</h3>
            <p className="ms-profile-details">{mortal.occupation}</p>
            <div className="ms-profile-zodiac">
              <span className="ms-profile-zodiac-badge">
                ☀️ {getZodiacSymbol(mortalAstro.sun)}
              </span>
              <span className="ms-profile-zodiac-badge">
                🌙 {getZodiacSymbol(mortalAstro.moon)}
              </span>
              <span className="ms-profile-zodiac-badge">
                💖 {getZodiacSymbol(mortalAstro.venus)}
              </span>
              <span className="ms-profile-zodiac-badge">
                🔥 {getZodiacSymbol(mortalAstro.mars)}
              </span>
            </div>
          </article>

          {/* Heart Connector */}
          <div className="ms-heart-connector">
            <Heart className="ms-heart-icon" fill="currentColor" />
            <span className="ms-heart-label">Match</span>
          </div>

          {/* Match */}
          <article className="ms-profile-card">
            <div className="ms-profile-avatar" style={{ background: "var(--ms-blue)" }}>
              <User />
            </div>
            <h3 className="ms-profile-name">{match.name.split(" ")[0]}</h3>
            <p className="ms-profile-details">{match.occupation}</p>
            <div className="ms-profile-zodiac">
              <span className="ms-profile-zodiac-badge">
                ☀️ {getZodiacSymbol(matchAstro.sun)}
              </span>
              <span className="ms-profile-zodiac-badge">
                🌙 {getZodiacSymbol(matchAstro.moon)}
              </span>
              <span className="ms-profile-zodiac-badge">
                💖 {getZodiacSymbol(matchAstro.venus)}
              </span>
              <span className="ms-profile-zodiac-badge">
                🔥 {getZodiacSymbol(matchAstro.mars)}
              </span>
            </div>
          </article>
        </div>

        {/* Compatibility Section */}
        <section className="ms-compatibility-section visible">
          <div className="ms-compatibility-card">
            <div className="ms-compatibility-header">
              <div>
                <h3 className="ms-compatibility-title">
                  {mortal.name.split(" ")[0]} & {match.name.split(" ")[0]}
                </h3>
                <p className="ms-compatibility-subtitle">Compatibility Analysis</p>
              </div>
              <div className="ms-compatibility-score">
                <div className="ms-compatibility-score-value">
                  {compatibility.overall_compatibility}
                </div>
                <span
                  className={`ms-compatibility-tier ${getTierClass(
                    compatibility.compatibility_tier
                  )}`}
                >
                  {compatibility.compatibility_tier}
                </span>
              </div>
            </div>
            <CompatibilityBars
              compatibility={compatibility}
              mortalAstro={mortalAstro}
              matchAstro={matchAstro}
              animate={true}
            />
          </div>
        </section>

        {/* Step Indicator */}
        <div className="ms-step-indicator">
          <span className="ms-step-dot completed" />
          <span className="ms-step-dot completed" />
          <span className="ms-step-dot completed" />
          <span className="ms-step-dot active" />
        </div>
      </div>

      {/* Play Button */}
      <section className="ms-nav-section">
        <button
          className="ms-nav-button ms-play-button"
          onClick={handlePlay}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Play fill="currentColor" />
              Play
            </>
          )}
        </button>
      </section>
    </>
  );
}
