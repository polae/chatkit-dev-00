"""Today's data store for Cupid Deluxe.

Handles loading mortal, matches, and compatibility data from YAML files.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List

import yaml

logger = logging.getLogger(__name__)


class TodayDataStore:
    """Loads and provides access to today's matchmaking data."""

    def __init__(self, data_dir: Path | None = None) -> None:
        if data_dir is None:
            data_dir = Path(__file__).parent / "today"
        self._data_dir = data_dir
        self._cache: Dict[str, Any] | None = None

    def _load_mortal(self) -> Dict[str, Any]:
        """Load the mortal's data (single file in mortal directory)."""
        mortal_dir = self._data_dir / "mortal"
        mortal_files = list(mortal_dir.glob("*.yaml"))
        if not mortal_files:
            raise FileNotFoundError("No mortal data found")
        with open(mortal_files[0], "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    def _load_matches(self) -> List[Dict[str, Any]]:
        """Load all matches from the matches directory."""
        matches_dir = self._data_dir / "matches"
        matches = []
        for match_file in sorted(matches_dir.glob("*.yaml")):
            with open(match_file, "r", encoding="utf-8") as f:
                match_data = yaml.safe_load(f)
            # Extract ID from filename (e.g., ethan_murphy_person.yaml -> ethan_murphy)
            match_id = match_file.stem.replace("_person", "")
            matches.append({"id": match_id, "data": match_data})
        return matches

    def _load_compatibility(self, mortal_name: str) -> Dict[str, Dict[str, Any]]:
        """Load compatibility data for all matches."""
        compat_dir = self._data_dir / "compatibility"
        compatibility: Dict[str, Dict[str, Any]] = {}
        mortal_name_normalized = mortal_name.lower().replace(" ", "_")

        for compat_file in compat_dir.glob("*.yaml"):
            with open(compat_file, "r", encoding="utf-8") as f:
                compat_data = yaml.safe_load(f)
            # Parse: {mortal}_{match}_compatibility.yaml
            stem = compat_file.stem.replace("_compatibility", "")
            if stem.startswith(mortal_name_normalized):
                match_id = stem[len(mortal_name_normalized) + 1:]  # +1 for underscore
                compatibility[match_id] = compat_data

        return compatibility

    def load(self, force_reload: bool = False) -> Dict[str, Any]:
        """Load today's data, using cache if available."""
        if self._cache is not None and not force_reload:
            return self._cache

        logger.info("Loading today's matchmaking data")
        mortal = self._load_mortal()
        matches = self._load_matches()
        compatibility = self._load_compatibility(mortal["name"])

        self._cache = {
            "mortal": mortal,
            "matches": matches,
            "compatibility": compatibility,
        }
        return self._cache

    def get_mortal(self) -> Dict[str, Any]:
        """Get just the mortal data."""
        data = self.load()
        return data["mortal"]

    def get_matches(self) -> List[Dict[str, Any]]:
        """Get the list of matches."""
        data = self.load()
        return data["matches"]

    def get_compatibility(self, match_id: str) -> Dict[str, Any] | None:
        """Get compatibility data for a specific match."""
        data = self.load()
        return data["compatibility"].get(match_id)


# Singleton instance
today_store = TodayDataStore()
