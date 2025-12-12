import { Play } from "lucide-react";
import { GREETING, VERSION, WELCOME_TEXT, WELCOME_DESCRIPTION } from "../../lib/config";

interface WelcomePageProps {
  onNext: () => void;
}

export function WelcomePage({ onNext }: WelcomePageProps) {
  return (
    <>
      <div className="ms-page-wrapper ms-welcome-page">
        {/* Title Section */}
        <section className="ms-welcome-hero">
          <h1 className="ms-welcome-title">{GREETING}</h1>
          <p className="ms-welcome-tagline">{WELCOME_TEXT}</p>
          <span className="ms-welcome-version">{VERSION}</span>
        </section>

        {/* Description */}
        <p className="ms-welcome-description">{WELCOME_DESCRIPTION}</p>

        {/* Decorative Fleuron */}
        <div className="ms-fleuron">
          <span className="ms-fleuron-dot" />
          <span className="ms-fleuron-dot" />
          <span className="ms-fleuron-dot" />
          <span className="ms-fleuron-dot" />
          <span className="ms-fleuron-dot" />
          <span className="ms-fleuron-dot" />
          <span className="ms-fleuron-dot" />
        </div>

        {/* Step Indicator */}
        <div className="ms-step-indicator">
          <span className="ms-step-dot active" />
          <span className="ms-step-dot" />
          <span className="ms-step-dot" />
          <span className="ms-step-dot" />
        </div>
      </div>

      {/* Navigation */}
      <section className="ms-nav-section">
        <button className="ms-nav-button ms-play-button" onClick={onNext}>
          <Play />
          Play
        </button>
      </section>
    </>
  );
}
