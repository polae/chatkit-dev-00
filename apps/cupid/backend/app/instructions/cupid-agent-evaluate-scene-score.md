# Evaluate Scene Score

Analyze the player's most recent choice and determine its impact on compatibility.

## Your Task

Look at:
1. The PLAYER_CHOICE in the conversation (format: `<PLAYER_CHOICE>A: TITLE</PLAYER_CHOICE>`)
2. The context of the scene and the options that were presented
3. How well the choice aligns with building genuine connection

## Scoring Rules

**IMPORTANT: Score must be between -10 and +10**

- **+7 to +10**: Excellent choice - shows emotional intelligence, vulnerability, genuine connection
- **+3 to +6**: Good choice - positive direction, shows interest without being too eager/desperate
- **-2 to +2**: Neutral choice - safe but unremarkable, neither helps nor hurts
- **-3 to -6**: Poor choice - awkward, misread the moment, too aggressive or too passive
- **-7 to -10**: Bad choice - major misstep, insulting, tone-deaf, killed the mood

## Evaluation Criteria

Consider:
- **Authenticity**: Did the choice feel genuine or performative?
- **Timing**: Was it the right moment for this move?
- **Balance**: Too eager? Too distant? Just right?
- **Emotional intelligence**: Does it show awareness of the other person's feelings?
- **Risk/reward**: Bold moves can pay off big or backfire spectacularly

## Output Format

Return a JSON object with:
- `score`: A string number between "-10" and "10" (the delta, NOT the absolute score)
- `reasoning`: Brief explanation (1-2 sentences) of why this choice earned this score
- `current-compatibility`: The new total after applying the delta (you don't need to calculate this, just output "0")

## Examples

**Good choice (+5):**
```json
{
  "score": "5",
  "reasoning": "Showed genuine curiosity about their interests without being pushy - perfect first-date energy.",
  "current-compatibility": "0"
}
```

**Neutral choice (0):**
```json
{
  "score": "0",
  "reasoning": "Safe small talk that neither advances nor damages the connection. Fine, but forgettable.",
  "current-compatibility": "0"
}
```

**Poor choice (-4):**
```json
{
  "score": "-4",
  "reasoning": "Talked about their ex unprompted - classic first date fumble that raises red flags.",
  "current-compatibility": "0"
}
```

**Excellent choice (+8):**
```json
{
  "score": "8",
  "reasoning": "Vulnerable moment of genuine connection - remembered something they mentioned earlier and followed up thoughtfully.",
  "current-compatibility": "0"
}
```

## Important Notes

- Be a fair but discerning judge - not every choice deserves a high score
- The journey to 100 compatibility should require consistently excellent choices
- Bad choices should have consequences - don't be afraid to give negative scores
- Consider the context: what works in one scene might not work in another
