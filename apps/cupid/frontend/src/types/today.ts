// Types for today's matchmaking data

export interface AstrologicalReference {
  sun: string;
  moon: string;
  venus: string;
  mars: string;
  ascendant: string;
}

export interface PersonPreferences {
  date_style: string[];
  love_language: string;
  interests: string[];
  ideal_partner_traits: string[];
}

export interface PersonData {
  name: string;
  age: number;
  gender: string;
  occupation: string;
  location: string;
  origin: string;
  bio: string;
  history: string;
  personality_traits: string[];
  preferences: PersonPreferences;
  astrological_reference: AstrologicalReference;
}

export interface PlanetCompatibility {
  planet_name: string;
  score: number;
  connection_intensity: number;
  compatibility_label: string;
  aspects: string[];
}

export interface CompatibilitySummary {
  total_aspects: number;
  harmonious_aspects: number;
  challenging_aspects: number;
  strengths: string[];
  challenges: string[];
}

export interface CompatibilityNarrative {
  first_impression: string;
  emotional_bond: string;
  romantic_chemistry: string;
  passion_dynamic: string;
  long_term_potential: string;
}

export interface CompatibilityData {
  subject1_name: string;
  subject2_name: string;
  overall_compatibility: number;
  connection_intensity: number;
  compatibility_tier: string;
  sun_compatibility: PlanetCompatibility;
  moon_compatibility: PlanetCompatibility;
  venus_compatibility: PlanetCompatibility;
  mars_compatibility: PlanetCompatibility;
  ascendant_compatibility: PlanetCompatibility;
  summary: CompatibilitySummary;
  narrative: CompatibilityNarrative;
}

export interface MatchEntry {
  id: string;
  data: PersonData;
}

export interface TodayData {
  mortal: PersonData;
  matches: MatchEntry[];
  compatibility: Record<string, CompatibilityData>;
}

// Zodiac sign mappings for display
export const ZODIAC_SYMBOLS: Record<string, string> = {
  Ari: "♈",
  Tau: "♉",
  Gem: "♊",
  Can: "♋",
  Leo: "♌",
  Vir: "♍",
  Lib: "♎",
  Sco: "♏",
  Sag: "♐",
  Cap: "♑",
  Aqu: "♒",
  Pis: "♓",
  // Full names
  Aries: "♈",
  Taurus: "♉",
  Gemini: "♊",
  Cancer: "♋",
  Virgo: "♍",
  Libra: "♎",
  Scorpio: "♏",
  Sagittarius: "♐",
  Capricorn: "♑",
  Aquarius: "♒",
  Pisces: "♓",
};

export const ZODIAC_NAMES: Record<string, string> = {
  Ari: "Aries",
  Tau: "Taurus",
  Gem: "Gemini",
  Can: "Cancer",
  Leo: "Leo",
  Vir: "Virgo",
  Lib: "Libra",
  Sco: "Scorpio",
  Sag: "Sagittarius",
  Cap: "Capricorn",
  Aqu: "Aquarius",
  Pis: "Pisces",
};

export function getZodiacSymbol(sign: string): string {
  return ZODIAC_SYMBOLS[sign] || sign;
}

export function getZodiacName(sign: string): string {
  return ZODIAC_NAMES[sign] || sign;
}
