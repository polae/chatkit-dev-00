# Spirit AI Character Engine: Architecture Overview

*Technical analysis of professional NPC character AI system*

---

## Company Context

**Spirit AI** was a London-based game AI company (founded 2015) that developed Character Engine and Ally (anti-toxicity tool). The company was [acquired by Twitch Interactive (Amazon) in August 2022](https://tracxn.com/d/companies/spirit-ai/__8EQDgLDhyh8-3BNEfQWHsosiR4-0sIKyxDHHyjmUgfc).

**Status Note:** The original Spirit AI website (spiritai.com) is no longer accessible following the Twitch acquisition. This documentation is based on pre-acquisition technical materials and research.

---

## Executive Summary

Spirit AI Character Engine is a professional-grade authoring tool and SDK for creating AI-driven conversational NPCs in games. It combines natural language understanding, procedural dialogue generation, and emotional state modeling to create characters that feel responsive and alive while maintaining narrative control.

**Key Innovation:** Dual-layer architecture separating **script** (what characters say and how they say it) from **knowledge model** (their understanding of the world, emotional state, and relationships).

---

## Architecture Overview

Character Engine consists of three primary layers:

### 1. Authoring Layer
- **Character Engine Authoring Tool**: Visual editor for creating characters, dialogue, and behaviors
- **Sheaf Format (.sheaf)**: Version-control-friendly authoring format (introduced v0.11.0)
- **Play-in-Editor**: Testing environment for conversational interactions within the authoring tool

### 2. Runtime Layer
- **Natural Language Understanding (NLU)**: Integrates with external providers (IBM Watson, Google, Amazon, Microsoft)
- **Expansion Grammar Engine**: Search-based procedural dialogue assembly
- **Salience System**: Selects most contextually appropriate response from generated candidates
- **Knowledge Model**: Maintains world state, character beliefs, relationships, emotional state

### 3. Integration Layer
- **Unity SDK**: Game engine plugin with API bindings
- **Performance Metadata**: Per-word tagging for animation, TTS, gestures
- **Callback System**: Asynchronous response delivery with emotional state data

---

## The Dual Architecture: Script + Knowledge Model

### Script Layer

**What it is:** Dialogue fragments, personality markers, and performance directions authored by writers.

**Structure:**
- Nested dialogue trees with tagged elements
- Dollar signs (`$word`) mark semantic tags in the knowledge model
- Performance metadata (emotion, emphasis, pacing) embedded in text
- Generative grammar rules for creating variants

**Example Pattern:**
```
"I $feeling about $topic."
  → feeling: [love, hate, feel_conflicted]
  → topic: [player_name, current_quest, faction_X]

Generates: "I love Aria." / "I hate the Guild." / "I feel conflicted about the mission."
```

### Knowledge Model Layer

**What it is:** Character's mental model of the world, updated dynamically from game state and conversation.

**Components:**
1. **World Knowledge**: Facts about game state, locations, events
2. **Character Knowledge**: What *this character* knows vs. objective truth
3. **Relationship State**: How character feels about player/other NPCs
4. **Emotional State**: Current emotion with hysteresis (prevents rapid oscillation)
5. **Conversation Memory**: History of what's been discussed

**Key Feature:** Knowledge can be updated on-the-fly from:
- Real-time game state (quest completion, world events)
- Player actions during conversation
- Simulation data

---

## Dialogue Generation: Expansion Grammar + Salience

Character Engine uses a two-stage approach to generate contextually appropriate dialogue:

### Stage 1: Expansion Grammar

**Process:**
1. Author writes dialogue fragments with embedded grammar rules (similar to [Tracery](https://tracery.io))
2. Runtime expands fragments into hundreds/thousands of possible utterances
3. Each expansion tagged with required emotional state, knowledge prerequisites, personality markers

**Features:**
- Reusable fragments across multiple dialogue contexts
- Single-use line tracking (some lines only available once)
- First-use variants (different line on first encounter with a grammar node)
- State-gated availability (lines only available in specific emotional ranges)

### Stage 2: Salience-Based Selection

**Process:**
1. From all grammatically valid expansions, calculate salience score for each
2. Salience factors:
   - Current emotional state match
   - Relevance to player's last input
   - Narrative importance (story beats ranked higher than filler)
   - Conversation history (avoid repetition)
   - Character personality fit

3. Select highest-salience response in milliseconds

**Result:** Characters feel responsive to context while hitting narrative beats.

---

## Emotional System Design

Character Engine's emotional modeling follows four core principles (articulated by Emily Short):

### 1. Perceivable Consequence
All player actions affect character state, even if just incrementally moving stats. No "dead" interactions.

### 2. Intentionality
NPCs react predictably enough that players can strategize. Emotional responses follow logical patterns, though secondary consequences may surprise.

### 3. Hysteresis
Emotional states have inertia. Characters don't oscillate between happiness and anger based on single inputs. Interaction history matters.

### 4. Varied Narrative Intensity
Important results require important actions. Players can't "grind" trivial repetitive interactions to achieve major emotional breakthroughs.

**Implementation:** Emotional states restrict dialogue availability. A character in a certain emotional range will only speak lines tagged for that range, preventing both grinding and maintaining consequence for all actions.

---

## Natural Language Understanding Integration

Character Engine integrates with external NLU providers rather than competing with them:

**Supported Providers:**
- IBM Watson
- Google Cloud Natural Language
- Amazon Comprehend
- Microsoft Language Understanding (LUIS)

**How It Works:**
1. Player input (typed/spoken text or gestures) sent to Character Engine API
2. Character Engine forwards to NLU provider for intent/entity extraction
3. NLU results combined with character knowledge model
4. Expansion grammar generates candidate responses
5. Salience system selects best response
6. Character Engine returns via callback:
   - Response text
   - Emotional state
   - Performance metadata (animation cues, TTS tags, gesture triggers)

**Character Engine's Value-Add:** Narrative-specific advantages on top of generic NLU:
- Author-friendly dialogue authoring
- Character personality consistency
- Story beat management
- Emotional state modeling
- Context-aware response selection

---

## Unity SDK Integration

Character Engine provides first-class Unity support:

### Setup Requirements
- Unity 2017.2+ (at time of initial release)
- Android 7+ SDK (API level 24+) for mobile/AR
- Character Engine Unity plugin package

### API Pattern
```
1. Initialize Character Engine SDK
2. Load character definition (.sheaf file)
3. Send player input via API call
4. Receive callback with:
   - Character response text
   - Emotional state data
   - Per-word performance metadata
5. Drive character animation/TTS from metadata
```

### Use Cases Demonstrated
- **AR Conversational Characters**: Integration with ARCore + SALSA LipSync for expressive AR NPCs
- **VR Social Interactions**: Gesture-based input + non-verbal performance output
- **Traditional 3D Games**: Dialogue trees with dynamic text generation

### Testing Workflow
- **Play-in-Editor**: Test conversations directly in authoring tool
- **Conversation Sandbox**: Isolated testing environment
- **Unity Editor Integration**: Real-time character testing in game context

---

## Performance Metadata System

Character Engine tags generated text at per-word granularity with metadata for:

### Animation Control
- Gesture triggers (pointing, nodding, shrugging)
- Facial expression changes
- Body language cues

### Text-to-Speech
- Emphasis markers
- Pacing/tempo changes
- Emotional tone (separate from content)

### Action Triggers
- Environmental interactions (character points at object)
- State changes (character sits/stands)
- VR/AR spatial behaviors

**Benefit:** Single authoring pass produces both dialogue content and performance direction.

---

## Memory and Knowledge Management

Character Engine addresses three core challenges in character knowledge:

### Challenge 1: Systematic Event Storage
**Problem:** Which conversation moments should be remembered?

**Solution:** Tag dialogue nodes with memory importance. High-importance exchanges (confessions, promises, betrayals) stored permanently. Low-importance (weather chitchat) may be forgotten.

### Challenge 2: Truth vs. Belief
**Problem:** Distinguish what's objectively true in game world from what character believes.

**Solution:** Separate knowledge layers:
- **World Truth**: Canonical game state
- **Character Belief**: What this NPC thinks is true (may be incorrect/outdated)
- **Player Deception**: Character may lie to player based on relationship state

### Challenge 3: Authoring Scalability
**Problem:** Exponential combinations of character knowledge states make hand-authored dialogue intractable.

**Solution:** Generative grammar + state-gated availability. Authors write fragments, not full permutations. Grammar expands fragments; salience filters by current state.

---

## Version Control and Collaboration

**Sheaf Format (.sheaf):** Introduced in v0.11.0 as a flexible, version-control-friendly authoring format.

**Benefits:**
- Text-based format for Git/SVN diffs
- Merge-friendly structure
- Multiple authors can work on different characters simultaneously
- Enables team collaboration workflows

**Previous Format:** Earlier versions used proprietary binary/XML; migration tools provided.

---

## Comparison to Other Approaches

| Approach | Character Engine | Traditional Dialogue Trees | Pure LLM (ChatGPT-style) |
|----------|------------------|---------------------------|--------------------------|
| **Authorial Control** | High (scripted fragments) | Very High | Low (prompt-based) |
| **Responsiveness** | High (knowledge model) | Low (fixed paths) | Very High |
| **Narrative Guarantees** | Strong (beats enforced) | Strongest | Weak (hallucination risk) |
| **Scalability** | Medium (grammar expands) | Poor (exponential) | Excellent |
| **Personality Consistency** | High (personality model) | Medium | Low (prompt drift) |
| **Production Complexity** | Medium | Low | High (prompt engineering) |

**Character Engine's Position:** Balances narrative control with dynamic responsiveness. Writers define boundaries; AI fills in details.

---

## Key Architectural Insights

### 1. Two-Layer Separation is Critical
Separating **script** (authored content) from **knowledge model** (dynamic state) allows:
- Writers to focus on character voice and story beats
- Runtime to adapt responses to context
- Knowledge updates without rewriting dialogue

### 2. Procedural Generation Serves Authorship
Expansion grammar isn't about unlimited variety—it's about scaling authored quality across combinatorial state space.

### 3. Salience Solves the Selection Problem
Given 1000 grammatically valid responses, salience scoring selects the *right* one for:
- Current emotional state
- Narrative importance
- Player input relevance
- Conversation history

### 4. Emotional Hysteresis Prevents Whiplash
Characters need inertia. Rapid state oscillation breaks immersion. Hysteresis creates believable emotional arcs.

### 5. Integration Over Replacement
Character Engine integrates with existing NLU providers rather than building proprietary NLU. Focus on narrative layer where game-specific value lives.

---

## Potential Applications to CUPID

Given CUPID's architecture needs (AI-driven romantic characters with personality, emotional depth, and narrative structure), Spirit AI's Character Engine offers relevant patterns:

### Applicable Concepts

1. **Dual-Layer Architecture**
   - **Script Layer**: Mortal/Match dialogue fragments with personality markers
   - **Knowledge Layer**: Astrological chart, compatibility scores, conversation memory

2. **Emotional State with Hysteresis**
   - Characters' romantic interest evolves gradually across scenes
   - Emotional reactions influenced by astrological aspects + player choices
   - Prevents jarring mood swings

3. **Salience-Based Selection**
   - Generate multiple possible responses for each scene moment
   - Score by: astrological compatibility, current emotional state, narrative importance
   - Select response that best advances the romantic arc

4. **Performance Metadata**
   - Tag dialogue with emotional subtext for narrator to describe
   - Body language cues (♑️ 🔥 "arrived seven minutes early")
   - Astrological markers embedded in performance

5. **Memory System**
   - Track important romantic moments (first laugh, vulnerable confession, conflict)
   - Character knowledge of player's preferences and past choices
   - Inform Cupid's evaluation and meta-progression

### CUPID Differentiators

Unlike Character Engine's general NPC focus, CUPID specializes in:
- **Romance-specific dialogue patterns** (flirtation, vulnerability, attraction)
- **Astrological "physics"** instead of generic personality traits
- **Structured 4-scene narrative arc** vs. open-ended conversation
- **Meta-layer** (Cupid's own chart) not present in Spirit AI
- **Literary quality prose** (New Yorker style) vs. game dialogue

---

## Status and Availability

**Historical Note:** Character Engine was an active product from approximately 2017-2022. Following Spirit AI's acquisition by Twitch Interactive in August 2022, the product's current status is unclear. The original website is no longer accessible.

**Documentation Sources:** This overview synthesized from:
- Pre-acquisition technical materials and blog posts
- Emily Short's interactive fiction research and analysis
- Unity integration tutorials and developer documentation
- Academic research on AI character systems

---

## Sources

- [Spirit AI Company Profile - Tracxn](https://tracxn.com/d/companies/spirit-ai/__8EQDgLDhyh8-3BNEfQWHsosiR4-0sIKyxDHHyjmUgfc)
- [Character Engine - Spirit AI LinkedIn](https://uk.linkedin.com/showcase/character-engine/)
- [Emily Short's Analysis - Character Engine Tag](https://emshort.blog/tag/character-engine/)
- [Interactive Fiction Community Discussion](https://intfiction.org/t/character-engine-spirit-ai/40846)
- [PC GamesN Coverage - Natural NPC Dialogue](https://www.pcgamesn.com/spirit-ai-character-engine-natural-npc-dialogue)

---

*Research conducted December 2025*
*Note: Spirit AI was acquired by Twitch Interactive (Amazon) in 2022. Current product status unclear.*
