JUST OUTPUT THE WIDGET AND NOTHING ELSE.

Here's how:

This guide explains how to find each piece of data your widget needs from the **compatibility input blob** (the semi-structured text containing overall and per-planet scores/aspects).

---

## 1) `scene`

```js
scene: { number: 1, name: "Meet-Cute" }
```

**Source:** **Not present** in the compatibility input.

**Where to get it:** Your game/workflow state (e.g., `state.chapter`, scene list) or hardcoded per step.

**Rule:**

- `scene.number` = current chapter/round index
- `scene.name` = label for that chapter (e.g., “Meet-Cute”, “First Date”, etc.)

---

## 2) `compatibility`

```js
compatibility: 52;
```

This is the **current scene’s compatibility**, not automatically the base score unless you decide it is.

**Input field:**

- `overall_compatibility: 69`

**Rules:**

1. If you **don’t** modify compatibility per scene:

   ```js
   compatibility = overall_compatibility;
   ```

2. If you **do** modify compatibility per scene:

   ```js
   compatibility = currentAdjustedScore; // computed by your game logic
   ```

So `compatibility: 52` implies an adjusted score coming from your scene/game rules.

---

## 3) `delta`

```js
delta: { value: 7, direction: "up" }
```

**Meaning:** Change between **current compatibility (Now)** and **base compatibility (Base)**.

**Base source:**

- `base = overall_compatibility` (from input)

**Now source:**

- `now = compatibility` (current scene-adjusted score)

**Compute:**

```js
delta.value = Math.abs(now - base);
delta.direction = now >= base ? "up" : "down";
```

**Example with input base=69 and now=52:**

```js
delta.value = |52 - 69| = 17
delta.direction = "down"
```

If your widget shows a different delta, that means you’re comparing against a different baseline (e.g., previous scene).

---

## 4) `bars`

```js
bars: [
  { label: "Now", percent: 52, color: "blue-500" },
  { label: "Base", percent: 69, color: "orange-500" },
];
```

**Derivation:**

- `"Base"` bar percent = `overall_compatibility` (input)
- `"Now"` bar percent = `compatibility` (current/adjusted)

**Rules:**

```js
bars[0].percent ("Now")  = compatibility
bars[1].percent ("Base") = overall_compatibility
```

---

## 5) `pills`

```js
pills: [
  { id: "sun", icon: "☀️", value: 72 },
  { id: "moon", icon: "🌙", value: 65 },
  { id: "heart", icon: "💖", value: 84 },
  { id: "fire", icon: "🔥", value: 58 },
];
```

Your input provides **planet scores**, so most pills map directly. Any differences imply **scene modifiers**.

### 5a) `sun`

**Input location:**

- `sun_compatibility:` → `score: <number>`

**Rule:**

```js
sun.value = sun_compatibility.score;
```

### 5b) `moon`

**Input location:**

- `moon_compatibility:` → `score: <number>`

**Rule:**

```js
moon.value = moon_compatibility.score;
```

### 5c) `fire`

Usually corresponds to **Mars** (passion/heat).

**Input location:**

- `mars_compatibility:` → `score: <number>`

**Rule:**

```js
fire.value = mars_compatibility.score;
```

### 5d) `heart`

Usually corresponds to **Venus** (love/affection).

**Input location:**

- `venus_compatibility:` → `score: <number>`

**Rule:**

```js
heart.value = venus_compatibility.score;
```

✅ If pills strictly mirror base input (no modifiers):

```js
pills = [
  { id: "sun", icon: "☀️", value: sun_compatibility.score },
  { id: "moon", icon: "🌙", value: moon_compatibility.score },
  { id: "heart", icon: "💖", value: venus_compatibility.score },
  { id: "fire", icon: "🔥", value: mars_compatibility.score },
];
```

If your displayed pill values differ, apply your scene adjustments **after** pulling these base numbers.

---

## Quick Mapping Table

| Widget field        | Present in input? | How to derive                                    |
| ------------------- | ----------------- | ------------------------------------------------ |
| scene.number        | ❌                | game state / chapter index                       |
| scene.name          | ❌                | game state / chapter label                       |
| compatibility (Now) | ⚠️ partial        | base is `overall_compatibility`; may be adjusted |
| delta               | ❌                | compute from Now vs Base                         |
| bars[Now].percent   | ⚠️ partial        | equals current compatibility                     |
| bars[Base].percent  | ✅                | `overall_compatibility`                          |
| pills.sun.value     | ✅                | `sun_compatibility.score`                        |
| pills.moon.value    | ✅                | `moon_compatibility.score`                       |
| pills.heart.value   | ✅ (Venus)        | `venus_compatibility.score`                      |
| pills.fire.value    | ✅ (Mars)         | `mars_compatibility.score`                       |

---

## Minimal Parsing Recipe (Pseudo-Logic)

1. **Parse top-level fields** until first `*_compatibility:` header.

   - grab `subject1_name`, `subject2_name`, `overall_compatibility`, `connection_intensity`, `compatibility_tier`.

2. **For each planet block**:

   - locate `<planet>_compatibility:` header.
   - slice until next header or `summary:`.
   - parse `planet_name`, `score`, optional `connection_intensity`, `compatibility_label`.
   - collect all aspect lines starting with `- ` under `aspects:`.

3. **Parse summary block**:

   - read `total_aspects`, `harmonious_aspects`, `challenging_aspects`.
   - collect bullet lines under `strengths:` and `challenges:`.

4. **Assemble widget JSON**:

   - `Base` = overall input score.
   - `Now` + scene fields = game/state logic.
   - pills from planet scores (apply modifiers if needed).

---

COMPATIBILITY INFO (base data from YAML):
{{state.compatibility}}

CURRENT ADJUSTED COMPATIBILITY: {{current_compatibility}}
CURRENT SCENE NUMBER: {{scene_number}}
SCORE DELTA THIS ROUND: {{input.output_parsed.score}}

IMPORTANT: Use {{current_compatibility}} as the "Now" value for `compatibility` and `bars[Now].percent`.
DO NOT compute "Now" from overall_compatibility - use the explicit {{current_compatibility}} value provided above.
Use {{scene_number}} for `scene.number`.
