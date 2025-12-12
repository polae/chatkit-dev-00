import clsx from "clsx";
import { ChatKitPanel } from "./components/ChatKitPanel";
import { ThemeToggle } from "./components/ThemeToggle";
import { MatchSelectionFlow } from "./components/MatchSelectionFlow";
import { useAppStore } from "./store/useAppStore";

export default function App() {
  const scheme = useAppStore((state) => state.scheme);
  const gamePhase = useAppStore((state) => state.gamePhase);
  const currentPage = useAppStore((state) => state.currentPage);

  // Show header on welcome page and when playing (chat phase)
  // Hide header on mortal, select, and confirm pages for more mobile space
  const showHeader = gamePhase === "playing" || currentPage === "welcome";

  const containerClass = clsx(
    "h-full transition-colors duration-300",
    scheme === "dark"
      ? "bg-slate-900 text-slate-100"
      : "bg-gradient-to-br from-[#f8f6f1] via-[#faf9f5] to-[#f8f6f1] text-slate-900"
  );

  const headerBarClass = clsx(
    "sticky top-0 z-30 w-full border-b backdrop-blur",
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
          className="mx-auto w-full max-w-4xl" 
          style={{ height: showHeader ? "calc(100dvh - 80px)" : "100dvh" }}
        >
          <MatchSelectionFlow />
        </div>
      ) : (
        <div 
          className="mx-auto w-full max-w-4xl px-3 pb-4 pt-3 sm:px-6 sm:pb-10 sm:pt-6" 
          style={{ height: showHeader ? "calc(100dvh - 80px)" : "100dvh" }}
        >
          <ChatKitPanel className="relative w-full h-full overflow-hidden rounded-2xl sm:rounded-3xl bg-[#f8f6f1]/80 shadow-lg ring-1 ring-slate-200/60 backdrop-blur dark:bg-slate-900/70 dark:ring-slate-800/60" />
        </div>
      )}
    </div>
  );
}
