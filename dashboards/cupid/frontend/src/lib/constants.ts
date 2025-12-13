export const AGENT_CATEGORIES: Record<string, string> = {
  HasEnded: 'routing',
  StartCupidGame: 'content',
  Introduction: 'content',
  DisplayMortal: 'ui',
  Mortal: 'content',
  DisplayMatch: 'ui',
  Match: 'content',
  DisplayCompatibilityCard: 'ui',
  CompatibilityAnalysis: 'content',
  DisplayChoices: 'ui',
  CupidEvaluation: 'meta',
  End: 'meta',
}

export const CHAPTER_NAMES: Record<number, string> = {
  0: 'Introduction',
  1: 'Meet the Mortal',
  2: 'Meet the Match',
  3: 'Compatibility Analysis',
  4: 'The Story',
  5: 'Cupid\'s Evaluation',
  6: 'The End',
}

export const AGENT_ORDER = [
  'HasEnded',
  'StartCupidGame',
  'Introduction',
  'DisplayMortal',
  'Mortal',
  'DisplayMatch',
  'Match',
  'DisplayCompatibilityCard',
  'CompatibilityAnalysis',
  'DisplayChoices',
  'CupidEvaluation',
  'End',
]
