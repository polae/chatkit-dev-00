import { StartScreenPrompt } from "@openai/chatkit";

export const CHATKIT_API_URL =
  import.meta.env.VITE_CHATKIT_API_URL ?? "/chatkit";

export const CHATKIT_API_DOMAIN_KEY =
  import.meta.env.VITE_CHATKIT_API_DOMAIN_KEY ?? "domain_pk_localhost_dev";

export const THEME_STORAGE_KEY = "cupid-theme";

export const GREETING = "CUPID";

export const STARTER_PROMPTS: StartScreenPrompt[] = [
  {
    label: "Play",
    prompt: "Play",
  },
];

// Custom welcome overlay content
export const WELCOME_IMAGE = "/cupid-cherub.svg";
export const WELCOME_TEXT = "interactive rom-com";
export const WELCOME_DESCRIPTION = "Astrology is the physics. Wit is the currency. Your choices shape love stories in real-time. Cupid is a story-driven game where your choices influence connection, compatibility, and chemistry.";
export const VERSION = "alpha v0.1";
