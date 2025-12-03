From the compatibility data below, output a CompatibilityAnalysis widget.

ONLY OUTPUT THE WIDGET.

## Field Mapping

- **title**: "{subject1_name} & {subject2_name}"
- **subtitle**: "Compatibility"
- **overall**: overall_compatibility (number 0-100)

## Items Array (one per planet)

| Planet | id | percent field | color | emoji |
|--------|-----|---------------|-------|-------|
| Sun | "sun" | sun_compatibility.score | yellow-400 | ☀️ |
| Moon | "moon" | moon_compatibility.score | purple-500 | 🌙 |
| Venus | "venus" | venus_compatibility.score | pink-400 | 💖 |
| Mars | "mars" | mars_compatibility.score | red-500 | 🔥 |

## Row Layout

Each row displays: `[leftEmoji] [leftZodiac]` — slider — `[rightZodiac] [rightEmoji]`

- **leftEmoji**: planet emoji (from table above)
- **leftZodiac**: subject1's zodiac sign emoji for that planet
- **rightZodiac**: subject2's zodiac sign emoji for that planet
- **rightEmoji**: planet emoji (same as leftEmoji)

## Zodiac Sign Emojis

| Sign | Emoji |
|------|-------|
| Aries | ♈️ |
| Taurus | ♉️ |
| Gemini | ♊️ |
| Cancer | ♋️ |
| Leo | ♌️ |
| Virgo | ♍️ |
| Libra | ♎️ |
| Scorpio | ♏️ |
| Sagittarius | ♐️ |
| Capricorn | ♑️ |
| Aquarius | ♒️ |
| Pisces | ♓️ |

{{state.compatibility}}
