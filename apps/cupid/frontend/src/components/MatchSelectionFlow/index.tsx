import { useEffect, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import type { TodayData } from "../../types/today";
import { WelcomePage } from "./WelcomePage";
import { SelectMatchPage } from "./SelectMatchPage";
import { ConfirmPage } from "./ConfirmPage";
import "../../styles/match-selection.css";

type FlowPage = "welcome" | "select" | "confirm";

export function MatchSelectionFlow() {
  const [currentPage, setCurrentPage] = useState<FlowPage>("welcome");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const todayData = useAppStore((state) => state.todayData);
  const setTodayData = useAppStore((state) => state.setTodayData);
  const selectedMatchId = useAppStore((state) => state.selectedMatchId);
  const scheme = useAppStore((state) => state.scheme);

  // Fetch today's data on mount
  useEffect(() => {
    async function fetchTodayData() {
      try {
        setLoading(true);
        const response = await fetch("/api/today");
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        const data: TodayData = await response.json();
        setTodayData(data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch today data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    if (!todayData) {
      fetchTodayData();
    } else {
      setLoading(false);
    }
  }, [todayData, setTodayData]);

  // Get selected match data
  const selectedMatch = selectedMatchId
    ? todayData?.matches.find((m) => m.id === selectedMatchId)
    : null;
  const selectedCompatibility = selectedMatchId
    ? todayData?.compatibility[selectedMatchId]
    : null;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent mx-auto" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading today's matches...
          </p>
        </div>
      </div>
    );
  }

  if (error || !todayData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-2">Failed to load match data</p>
          <p className="text-sm text-slate-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const containerClass =
    scheme === "dark"
      ? "min-h-full bg-slate-900 text-slate-100"
      : "min-h-full bg-[#f8f6f1] text-[#464646]";

  return (
    <div className={containerClass}>
      {currentPage === "welcome" && (
        <WelcomePage
          mortal={todayData.mortal}
          onNext={() => setCurrentPage("select")}
        />
      )}
      {currentPage === "select" && (
        <SelectMatchPage
          mortal={todayData.mortal}
          matches={todayData.matches}
          compatibility={todayData.compatibility}
          onBack={() => setCurrentPage("welcome")}
          onNext={() => setCurrentPage("confirm")}
        />
      )}
      {currentPage === "confirm" && selectedMatch && selectedCompatibility && (
        <ConfirmPage
          mortal={todayData.mortal}
          match={selectedMatch.data}
          compatibility={selectedCompatibility}
          onBack={() => setCurrentPage("select")}
        />
      )}
    </div>
  );
}
