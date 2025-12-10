import { create } from "zustand";
import { THEME_STORAGE_KEY } from "../lib/config";
import type { TodayData } from "../types/today";

export type ColorScheme = "light" | "dark";
export type GamePhase = "selection" | "playing";

type AppState = {
  // Theme
  scheme: ColorScheme;
  setScheme: (scheme: ColorScheme) => void;

  // Thread
  threadId: string | null;
  setThreadId: (threadId: string | null) => void;

  // Game phase
  gamePhase: GamePhase;
  setGamePhase: (phase: GamePhase) => void;

  // Today's data
  todayData: TodayData | null;
  setTodayData: (data: TodayData) => void;

  // Selected match
  selectedMatchId: string | null;
  setSelectedMatchId: (matchId: string | null) => void;

  // Session ID for match selection (passed via header to backend)
  matchSessionId: string | null;
  setMatchSessionId: (sessionId: string | null) => void;

  // Start game action
  startGame: () => void;

  // Reset for new game
  resetGame: () => void;
};

function getInitialScheme(): ColorScheme {
  if (typeof window === "undefined") {
    return "light";
  }
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ColorScheme | null;
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function syncSchemeWithDocument(scheme: ColorScheme) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }
  const root = document.documentElement;
  if (scheme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  window.localStorage.setItem(THEME_STORAGE_KEY, scheme);
}

export const useAppStore = create<AppState>((set) => {
  const initialScheme = getInitialScheme();
  syncSchemeWithDocument(initialScheme);

  return {
    // Theme
    scheme: initialScheme,
    setScheme: (scheme) => {
      syncSchemeWithDocument(scheme);
      set({ scheme });
    },

    // Thread
    threadId: null,
    setThreadId: (threadId) => set({ threadId }),

    // Game phase - start in selection mode
    gamePhase: "selection",
    setGamePhase: (gamePhase) => set({ gamePhase }),

    // Today's data
    todayData: null,
    setTodayData: (todayData) => set({ todayData }),

    // Selected match
    selectedMatchId: null,
    setSelectedMatchId: (selectedMatchId) => set({ selectedMatchId }),

    // Session ID for match selection
    matchSessionId: null,
    setMatchSessionId: (matchSessionId) => set({ matchSessionId }),

    // Start game - transition to playing phase
    startGame: () => set({ gamePhase: "playing" }),

    // Reset for new game
    resetGame: () =>
      set({
        gamePhase: "selection",
        threadId: null,
        selectedMatchId: null,
        matchSessionId: null,
      }),
  };
});
