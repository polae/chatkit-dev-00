import { useEffect, useRef } from "react";
import clsx from "clsx";
import { ChatKitPanel } from "./components/ChatKitPanel";
import { ThemeToggle } from "./components/ThemeToggle";
import { MatchSelectionFlow } from "./components/MatchSelectionFlow";
import { useAppStore } from "./store/useAppStore";

export default function App() {
  const scheme = useAppStore((state) => state.scheme);
  const gamePhase = useAppStore((state) => state.gamePhase);
  const currentPage = useAppStore((state) => state.currentPage);
  const selectionScrollRef = useRef<HTMLDivElement | null>(null);

  // Show header on welcome page and when playing (chat phase)
  // Hide header on mortal, select, and confirm pages for more mobile space
  const showHeader = gamePhase === "playing" || currentPage === "welcome";

  // Ensure each step loads scrolled to the top (prevents carrying scroll position between pages)
  useEffect(() => {
    if (gamePhase === "selection") {
      selectionScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [gamePhase, currentPage]);

  const containerClass = clsx(
    "flex flex-col h-full w-full transition-colors duration-300",
    scheme === "dark"
      ? "bg-slate-900 text-slate-100"
      : "bg-gradient-to-br from-[#f8f6f1] via-[#faf9f5] to-[#f8f6f1] text-slate-900"
  );

  const headerBarClass = clsx(
    "flex-shrink-0 w-full border-b backdrop-blur",
    scheme === "dark"
      ? "bg-slate-900/80 border-slate-800/70 text-slate-100"
      : "bg-[#f8f6f1]/90 border-slate-200/70 text-slate-900"
  );

  return (
    <div className={containerClass}>
      {showHeader && (
        <div className={headerBarClass}>
          <div className="relative mx-auto flex w-full max-w-4xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
            <img src="/cupid-cherub.svg" alt="Cupid" className="h-6 w-6" />
            <h1 className="text-lg font-semibold">Cupid</h1>
            <p className="flex-1 text-sm text-slate-600 dark:text-slate-300">
              interactive rom-com
            </p>
            <ThemeToggle />
          </div>
        </div>
      )}

      {gamePhase === "selection" ? (
        <div 
          ref={selectionScrollRef}
          className="flex-1 min-h-0 mx-auto w-full max-w-4xl overflow-y-auto overscroll-contain"
        >
          <MatchSelectionFlow />
        </div>
      ) : (
        <div className="flex-1 min-h-0 mx-auto w-full max-w-4xl px-3 pb-4 pt-3 sm:px-6 sm:pb-10 sm:pt-6">
          <ChatKitPanel className="relative w-full h-full overflow-hidden rounded-2xl sm:rounded-3xl bg-[#f8f6f1]/80 shadow-lg ring-1 ring-slate-200/60 backdrop-blur dark:bg-slate-900/70 dark:ring-slate-800/60" />
        </div>
      )}
    </div>
  );
}
