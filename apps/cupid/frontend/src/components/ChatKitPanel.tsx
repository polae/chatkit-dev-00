import { useEffect, useMemo, useRef } from "react";
import { ChatKit, useChatKit } from "@openai/chatkit-react";
import clsx from "clsx";

import {
  CHATKIT_API_DOMAIN_KEY,
  CHATKIT_API_URL,
  GREETING,
  STARTER_PROMPTS,
} from "../lib/config";
import { LEXEND_FONT_SOURCES } from "../lib/fonts";
import { useAppStore } from "../store/useAppStore";

export type ChatKitControl = ReturnType<typeof useChatKit>;

type ChatKitPanelProps = {
  onChatKitReady?: (chatkit: ChatKitControl) => void;
  className?: string;
};

export function ChatKitPanel({ onChatKitReady, className }: ChatKitPanelProps) {
  const theme = useAppStore((state) => state.scheme);
  const threadId = useAppStore((state) => state.threadId);
  const setThreadId = useAppStore((state) => state.setThreadId);
  const selectedMatchId = useAppStore((state) => state.selectedMatchId);
  const matchSessionId = useAppStore((state) => state.matchSessionId);
  const gamePhase = useAppStore((state) => state.gamePhase);

  // Track if we've already started the game
  const hasStartedGame = useRef(false);

  // Custom fetch that passes match session ID via header
  const customFetch = useMemo(() => {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers ?? {});
      if (matchSessionId) {
        headers.set("x-match-session-id", matchSessionId);
      }
      return fetch(input, {
        ...init,
        headers,
      });
    };
  }, [matchSessionId]);

  const chatkit = useChatKit({
    api: { url: CHATKIT_API_URL, domainKey: CHATKIT_API_DOMAIN_KEY, fetch: customFetch },
    theme: {
      density: "spacious",
      colorScheme: theme,
      color: {
        ...(theme === "light" ? {
          surface: {
            background: "#f8f6f1",
            foreground: "#faf9f5"
          }
        } : {}),
        grayscale: {
          hue: 220,
          tint: 6,
          shade: theme === "dark" ? -1 : -4,
        },
        accent: {
          primary: theme === "dark" ? "#f1f5f9" : "#0f172a",
          level: 1,
        },
      },
      radius: "round",
      typography: {
        fontFamily: "Lexend, sans-serif",
        fontSources: LEXEND_FONT_SOURCES,
      },
    },
    startScreen: {
      greeting: GREETING,
      prompts: STARTER_PROMPTS,
    },
    composer: {
      placeholder: "Type your message...",
    },
    threadItemActions: {
      feedback: false,
    },
    onThreadChange: ({ threadId }) => setThreadId(threadId),
    onError: ({ error }) => {
      console.error("ChatKit error", error);
    },
    onReady: () => {
      onChatKitReady?.(chatkit);
    },
  });

  // Auto-start the game when ChatKitPanel is shown after match selection
  useEffect(() => {
    async function startGameWithSelectedMatch() {
      if (
        gamePhase === "playing" &&
        !threadId &&
        !hasStartedGame.current &&
        matchSessionId &&
        selectedMatchId
      ) {
        hasStartedGame.current = true;

        // Send just "Play" - the session ID is passed via x-match-session-id header
        await chatkit.sendUserMessage({
          text: "Play",
          newThread: true,
        });
      }
    }

    startGameWithSelectedMatch();
  }, [gamePhase, threadId, matchSessionId, selectedMatchId, chatkit]);

  return (
    <div className={clsx("relative h-full w-full overflow-hidden", className)}>
      <ChatKit control={chatkit.control} className="block h-full w-full" />
    </div>
  );
}
