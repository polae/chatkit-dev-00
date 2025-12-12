import { Play } from "lucide-react";
import {
  GREETING,
  VERSION,
  WELCOME_TEXT,
  WELCOME_DESCRIPTION,
  WELCOME_IMAGE,
} from "../../lib/config";

interface WelcomePageProps {
  onNext: () => void;
}

export function WelcomePage({ onNext }: WelcomePageProps) {
  return (
    <>
      <div className="ms-page-wrapper ms-welcome-page">
        {/* Title Section */}
        <section className="ms-welcome-hero">
          <img src={WELCOME_IMAGE} alt="Cupid" className="ms-welcome-logo" />
          <h1 className="ms-welcome-title">{GREETING}</h1>
          <p className="ms-welcome-tagline">{WELCOME_TEXT}</p>
          <span className="ms-welcome-version">{VERSION}</span>
        </section>

        {/* Description */}
        <p className="ms-welcome-description">{WELCOME_DESCRIPTION}</p>
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
