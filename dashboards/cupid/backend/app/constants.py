"""Shared constants for Cupid dashboard."""

# Agent categories for Cupid game
AGENT_CATEGORIES: dict[str, str] = {
    "HasEnded": "routing",
    "StartCupidGame": "control",
    "Introduction": "content",
    "DisplayMortal": "ui",
    "Mortal": "content",
    "DisplayMatch": "ui",
    "Match": "content",
    "DisplayCompatibilityCard": "ui",
    "CompatibilityAnalysis": "content",
    "DisplayChoices": "ui",
    "CupidEvaluation": "content",
    "End": "control",
}

# Chapter names for display
CHAPTER_NAMES: dict[int, str] = {
    0: "Introduction",
    1: "Mortal",
    2: "Match",
    3: "Compatibility",
    4: "Story",
    5: "Evaluation",
    6: "End",
}
