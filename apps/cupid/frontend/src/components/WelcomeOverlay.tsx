import { WELCOME_IMAGE, WELCOME_TEXT, WELCOME_DESCRIPTION, VERSION } from "../lib/config";
import type { ChatKitControl } from "./ChatKitPanel";

type WelcomeOverlayProps = {
  chatkit: ChatKitControl;
  theme: "light" | "dark";
};

export function WelcomeOverlay({ chatkit, theme }: WelcomeOverlayProps) {
  const handlePlay = async () => {
    // Send the "Play" message to start the game (creates a new thread automatically)
    await chatkit.sendUserMessage({ text: "Play", newThread: true });
  };

  const isDark = theme === "dark";

  return (
    <div
      className={`absolute inset-0 z-10 flex flex-col justify-center px-12 ${
        isDark ? "bg-[#101721]" : "bg-[#f8f6f1]"
      }`}
    >
      <div className="flex flex-col items-start gap-2 max-w-md">
        {/* Cupid Image */}
        <img
          src={WELCOME_IMAGE}
          alt="Cupid"
          className={`w-24 h-24 mb-4 ${isDark ? "opacity-80" : "opacity-90"}`}
        />

        {/* Title */}
        <h1
          className={`text-5xl font-bold tracking-widest ${
            isDark ? "text-white" : "text-slate-900"
          }`}
        >
          Cupid
        </h1>

        {/* Version */}
        <span className="text-sm text-blue-500 -mt-1">{VERSION}</span>

        {/* Subtitle */}
        <h2
          className={`text-2xl font-medium tracking-wide mt-2 ${
            isDark ? "text-white" : "text-slate-800"
          }`}
        >
          {WELCOME_TEXT}
        </h2>

        {/* Description */}
        <p
          className={`text-base mt-2 ${
            isDark ? "text-gray-400" : "text-slate-600"
          }`}
        >
          {WELCOME_DESCRIPTION}
        </p>

        {/* Play Button */}
        <button
          onClick={handlePlay}
          className={`mt-8 flex items-center gap-3 transition-colors cursor-pointer ${
            isDark
              ? "text-gray-400 hover:text-white"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M10 8l6 4-6 4V8z" fill="currentColor" />
          </svg>
          <span className="text-xl">Play</span>
        </button>
      </div>
    </div>
  );
}
