/**
 * Langfuse API Client for Cupid Dashboard
 *
 * Provides methods to fetch traces, sessions, observations, and metrics
 * from the Langfuse API.
 *
 * NOTE: Direct browser requests to Langfuse API may fail due to CORS.
 * This client includes mock data fallback for UI testing.
 */

const LANGFUSE_CONFIG = {
  baseUrl: 'https://us.cloud.langfuse.com/api/public',
  publicKey: 'pk-lf-b957e40e-94f5-4654-a74d-97d190b18e12',
  secretKey: 'sk-lf-c4956a16-4229-4146-af77-b5311b7eb253'
};

// Use JSON data files instead of API (downloaded from Langfuse via download-data.js)
// This avoids CORS issues and provides real production data
const USE_JSON_DATA = true;

// Fallback to mock data if JSON fails to load
const USE_MOCK_ON_ERROR = true;

// Cache for loaded JSON data
let LOADED_JSON_DATA = null;

// Mock data for UI testing - reflects actual Cupid agent structure
const MOCK_DATA = {
  sessions: [
    { id: 'thr_561d0a67', createdAt: '2025-12-13T04:19:02.844Z', environment: 'default' },
    { id: 'thr_a5dae04c', createdAt: '2025-12-12T22:08:52.039Z', environment: 'default' },
    { id: 'thr_311518c9', createdAt: '2025-12-12T21:39:37.298Z', environment: 'default' },
    { id: 'thr_6e396921', createdAt: '2025-12-12T20:50:13.263Z', environment: 'default' },
  ],
  traces: [
    { id: '6f1ab540402efbf03fe4a197760767b6', name: 'Agent workflow', timestamp: '2025-12-13T04:20:01.036Z', sessionId: 'thr_561d0a67', userId: 'e60d45d1-e8ce-4ba8-9a9e-fac552cd5dc5', tags: ['chapter_3', 'cupid'], totalCost: 0.009485, latency: 10.709, metadata: { mortal: 'Maya Brooks', match: 'Ethan Murphy' } },
    { id: '292c2d1f2b0f99e7f6c95c4507081b0f', name: 'Agent workflow', timestamp: '2025-12-13T04:19:52.787Z', sessionId: 'thr_561d0a67', userId: 'e60d45d1-e8ce-4ba8-9a9e-fac552cd5dc5', tags: ['chapter_3', 'cupid'], totalCost: 0.005645, latency: 8.241, metadata: { mortal: 'Maya Brooks', match: 'Ethan Murphy' } },
    { id: '318cb851920b17a3a3a9c66c98414af2', name: 'Agent workflow', timestamp: '2025-12-13T04:19:31.807Z', sessionId: 'thr_561d0a67', userId: 'e60d45d1-e8ce-4ba8-9a9e-fac552cd5dc5', tags: ['chapter_2', 'cupid'], totalCost: 0.0092675, latency: 8.314, metadata: { mortal: 'Maya Brooks', match: 'Ethan Murphy' } },
    { id: '22dde5cbf91ceeb3bed36d443feb68b5', name: 'Agent workflow', timestamp: '2025-12-13T04:19:25.300Z', sessionId: 'thr_561d0a67', userId: 'e60d45d1-e8ce-4ba8-9a9e-fac552cd5dc5', tags: ['chapter_1', 'cupid'], totalCost: 0.0016925, latency: 1.949, metadata: { mortal: 'Maya Brooks', match: 'Ethan Murphy' } },
    { id: 'c958038a4e36c45fdb6be7245e678306', name: 'Agent workflow', timestamp: '2025-12-13T04:19:14.715Z', sessionId: 'thr_561d0a67', userId: 'e60d45d1-e8ce-4ba8-9a9e-fac552cd5dc5', tags: ['chapter_1', 'cupid'], totalCost: 0.0093325, latency: 10.584, metadata: { mortal: 'Maya Brooks', match: 'Ethan Murphy' } },
    { id: 'abc123def456', name: 'Agent workflow', timestamp: '2025-12-12T22:10:00.000Z', sessionId: 'thr_a5dae04c', userId: 'user-456', tags: ['chapter_2', 'cupid'], totalCost: 0.0078, latency: 7.2, metadata: { mortal: 'Sophie Chen', match: 'James Wilson' } },
    { id: 'def456ghi789', name: 'Agent workflow', timestamp: '2025-12-12T21:45:00.000Z', sessionId: 'thr_311518c9', userId: 'user-789', tags: ['chapter_1', 'cupid'], totalCost: 0.0065, latency: 5.8, metadata: { mortal: 'Alex Rivera', match: 'Sam Taylor' } },
  ],
  observations: [
    // Trace 1: CompatibilityAnalysis (chapter_3)
    { id: '33142946827935b0', traceId: '6f1ab540402efbf03fe4a197760767b6', type: 'AGENT', name: 'Agent workflow', startTime: '2025-12-13T04:20:01.036Z', endTime: '2025-12-13T04:20:11.745Z', parentObservationId: null, metadata: {} },
    { id: '4fb5a089137f4234', traceId: '6f1ab540402efbf03fe4a197760767b6', type: 'AGENT', name: 'CompatibilityAnalysis', startTime: '2025-12-13T04:20:01.036Z', endTime: '2025-12-13T04:20:11.745Z', parentObservationId: '33142946827935b0', metadata: {} },
    { id: '3bee2ffbcccfbb8e', traceId: '6f1ab540402efbf03fe4a197760767b6', type: 'GENERATION', name: 'response', startTime: '2025-12-13T04:20:01.037Z', endTime: '2025-12-13T04:20:11.743Z', totalTokens: 3696, promptTokens: 3140, completionTokens: 556, calculatedTotalCost: 0.009485, model: 'gpt-5.1-2025-11-13', level: 'DEFAULT', parentObservationId: '4fb5a089137f4234', metadata: {}, input: [{ role: 'user', content: 'Continue' }], output: { text: "## Compatibility Analysis\n\n### Overall Score: 78%\n\n**Maya Brooks (Taurus)** and **Ethan Murphy (Scorpio)** represent a classic case of opposites attract. This earth-water pairing creates a magnetic connection that's both challenging and deeply rewarding.\n\n### Elemental Harmony\n- **Earth + Water**: Taurus provides stability while Scorpio brings emotional depth\n- Natural nurturing dynamic between these elements\n- Potential for lasting foundation\n\n### Key Strengths\n1. **Loyalty**: Both signs are fiercely devoted once committed\n2. **Intensity**: Neither does anything halfway\n3. **Security**: Both value stability in relationships\n\n### Challenges\n1. **Stubbornness**: Both can be immovable in disagreements\n2. **Possessiveness**: Strong need for control on both sides\n3. **Communication**: Taurus is direct, Scorpio is cryptic\n\n*This match has serious long-term potential if both partners can navigate their natural intensity.*" } },

    // Trace 2: DisplayCompatibilityCard (chapter_3)
    { id: 'c736a139a151dc18', traceId: '292c2d1f2b0f99e7f6c95c4507081b0f', type: 'AGENT', name: 'Agent workflow', startTime: '2025-12-13T04:19:52.787Z', endTime: '2025-12-13T04:20:01.027Z', parentObservationId: null, metadata: {} },
    { id: '6c2c8c824656a013', traceId: '292c2d1f2b0f99e7f6c95c4507081b0f', type: 'AGENT', name: 'DisplayCompatibilityCard', startTime: '2025-12-13T04:19:52.788Z', endTime: '2025-12-13T04:20:01.027Z', parentObservationId: 'c736a139a151dc18', metadata: {} },
    { id: 'gen-display-compat', traceId: '292c2d1f2b0f99e7f6c95c4507081b0f', type: 'GENERATION', name: 'response', startTime: '2025-12-13T04:19:52.789Z', endTime: '2025-12-13T04:20:01.025Z', totalTokens: 1786, promptTokens: 1200, completionTokens: 586, calculatedTotalCost: 0.005645, model: 'gpt-5.1-2025-11-13', level: 'DEFAULT', parentObservationId: '6c2c8c824656a013', metadata: {}, input: [{ role: 'user', content: 'Show me the compatibility analysis' }], output: { text: "Displaying compatibility card for **Maya** and **Ethan**...\n\n[Widget: CompatibilityCard rendered]" } },

    // Trace 3: Match (chapter_2)
    { id: '9d17bb4ab75bdb6f', traceId: '318cb851920b17a3a3a9c66c98414af2', type: 'AGENT', name: 'Agent workflow', startTime: '2025-12-13T04:19:31.807Z', endTime: '2025-12-13T04:19:40.121Z', parentObservationId: null, metadata: {} },
    { id: 'a3c9bd4af69e5423', traceId: '318cb851920b17a3a3a9c66c98414af2', type: 'AGENT', name: 'Match', startTime: '2025-12-13T04:19:31.807Z', endTime: '2025-12-13T04:19:40.121Z', parentObservationId: '9d17bb4ab75bdb6f', metadata: {} },
    { id: 'gen-match-1', traceId: '318cb851920b17a3a3a9c66c98414af2', type: 'GENERATION', name: 'response', startTime: '2025-12-13T04:19:31.808Z', endTime: '2025-12-13T04:19:40.120Z', totalTokens: 3970, promptTokens: 2800, completionTokens: 1170, calculatedTotalCost: 0.0092675, model: 'gpt-5.1-2025-11-13', level: 'DEFAULT', parentObservationId: 'a3c9bd4af69e5423', metadata: {}, input: [{ role: 'user', content: 'Continue' }], output: { text: "## THE MATCH\n\n### Ethan Murphy ♏️\n**Scorpio** | November 8, 1992\n\n📍 **From**: Brooklyn, NY\n🎓 **Education**: Columbia Law School\n💼 **Occupation**: Environmental Attorney\n\n---\n\n### About\nEthan is a passionate advocate who channels his intensity into fighting for environmental causes. By day, he takes on corporate polluters. By night, he's probably reading philosophy or training for his next marathon.\n\n### Personality\n- Deeply intuitive and emotionally intelligent\n- Fiercely loyal to those he loves\n- Can be secretive and slow to trust\n- All-or-nothing approach to everything\n\n### Looking For\nSomeone genuine who isn't intimidated by depth. He wants a partner who can match his intensity without trying to change him.\n\n### Fun Fact\nHas successfully argued three cases before the state Supreme Court and still gets nervous ordering coffee." } },

    // Trace 4: DisplayMatch (chapter_1)
    { id: '78a66dc6ce529d01', traceId: '22dde5cbf91ceeb3bed36d443feb68b5', type: 'AGENT', name: 'Agent workflow', startTime: '2025-12-13T04:19:25.300Z', endTime: '2025-12-13T04:19:27.249Z', parentObservationId: null, metadata: {} },
    { id: '84611c1c737424d7', traceId: '22dde5cbf91ceeb3bed36d443feb68b5', type: 'AGENT', name: 'DisplayMatch', startTime: '2025-12-13T04:19:25.301Z', endTime: '2025-12-13T04:19:27.248Z', parentObservationId: '78a66dc6ce529d01', metadata: {} },
    { id: 'gen-display-match', traceId: '22dde5cbf91ceeb3bed36d443feb68b5', type: 'GENERATION', name: 'response', startTime: '2025-12-13T04:19:25.302Z', endTime: '2025-12-13T04:19:27.247Z', totalTokens: 780, promptTokens: 500, completionTokens: 280, calculatedTotalCost: 0.0016925, model: 'gpt-5.1-2025-11-13', level: 'DEFAULT', parentObservationId: '84611c1c737424d7', metadata: {}, input: [{ role: 'user', content: 'Show me the match' }], output: { text: "Now displaying the match card for **Ethan Murphy**...\n\n[Widget: MatchCard rendered]" } },

    // Trace 5: Mortal (chapter_1)
    { id: 'b6ebd53eb5e0f5a8', traceId: 'c958038a4e36c45fdb6be7245e678306', type: 'AGENT', name: 'Agent workflow', startTime: '2025-12-13T04:19:14.715Z', endTime: '2025-12-13T04:19:25.299Z', parentObservationId: null, metadata: {} },
    { id: 'edf1372aa1cb3077', traceId: 'c958038a4e36c45fdb6be7245e678306', type: 'AGENT', name: 'Mortal', startTime: '2025-12-13T04:19:14.715Z', endTime: '2025-12-13T04:19:25.299Z', parentObservationId: 'b6ebd53eb5e0f5a8', metadata: {} },
    { id: 'gen-mortal-1', traceId: 'c958038a4e36c45fdb6be7245e678306', type: 'GENERATION', name: 'response', startTime: '2025-12-13T04:19:14.716Z', endTime: '2025-12-13T04:19:25.298Z', totalTokens: 3231, promptTokens: 2100, completionTokens: 1131, calculatedTotalCost: 0.0093325, model: 'gpt-5.1-2025-11-13', level: 'DEFAULT', parentObservationId: 'edf1372aa1cb3077', metadata: {}, input: [{ role: 'user', content: 'Start the game' }], output: { text: "## THE MORTAL\n\n### Maya Brooks ♉️\n**Taurus** | May 12, 1994\n\n📍 **From**: San Francisco, CA\n🎓 **Education**: Stanford University\n💼 **Occupation**: Product Designer at a tech startup\n\n---\n\n### About\nMaya is a creature of comfort who finds beauty in the everyday. She's the friend who always knows the best restaurants and never forgets a birthday. When she's not designing intuitive user experiences, you'll find her tending to her impressive houseplant collection or trying a new recipe.\n\n### Personality\n- Grounded and reliable\n- Appreciates the finer things\n- Stubborn but fiercely loyal\n- Takes her time making decisions\n\n### Looking For\nSomeone who values stability but knows how to surprise her. Must love good food and even better conversation.\n\n### Fun Fact\nHas named all 47 of her houseplants and maintains a detailed watering schedule in a color-coded spreadsheet." } },

    // Additional agents: Introduction, DisplayMortal (from other traces)
    { id: 'agent-intro-parent', traceId: 'abc123def456', type: 'AGENT', name: 'Agent workflow', startTime: '2025-12-12T22:10:00.000Z', endTime: '2025-12-12T22:10:07.200Z', parentObservationId: null, metadata: {} },
    { id: 'agent-intro-1', traceId: 'abc123def456', type: 'AGENT', name: 'Introduction', startTime: '2025-12-12T22:10:00.001Z', endTime: '2025-12-12T22:10:07.199Z', parentObservationId: 'agent-intro-parent', metadata: {} },
    { id: 'gen-intro-1', traceId: 'abc123def456', type: 'GENERATION', name: 'response', startTime: '2025-12-12T22:10:00.002Z', endTime: '2025-12-12T22:10:07.198Z', totalTokens: 1200, promptTokens: 800, completionTokens: 400, calculatedTotalCost: 0.0032, model: 'gpt-5.1-2025-11-13', level: 'DEFAULT', parentObservationId: 'agent-intro-1', metadata: {}, input: null, output: { text: "# Welcome to CUPID 💘\n\nWhere you're the one in the clouds and I'm the voice reminding you that love is a battlefield... and you're about to parachute in without checking your landing zone.\n\nI'm **Cupid**, your celestially-challenged matchmaker. I've been doing this for millennia, and let me tell you - mortals never change. You all want the same thing: someone who \"gets\" you, challenges you, and doesn't hog the blankets.\n\n## How This Works\n\n1. I'll show you a **Mortal** - someone looking for love\n2. Then I'll present a **Match** - a potential partner\n3. You'll see their **Compatibility Analysis**\n4. And you'll make the call: **Match** or **Pass**\n\nNo pressure. I mean, yes, you're literally playing with people's hearts. But no pressure.\n\nReady to play god? (Don't answer that - I already know you are.)\n\n*Click Continue when you're ready to meet your first mortal.*" } },

    { id: 'agent-mortal-parent', traceId: 'def456ghi789', type: 'AGENT', name: 'Agent workflow', startTime: '2025-12-12T21:45:00.000Z', endTime: '2025-12-12T21:45:05.800Z', parentObservationId: null, metadata: {} },
    { id: 'agent-display-mortal-1', traceId: 'def456ghi789', type: 'AGENT', name: 'DisplayMortal', startTime: '2025-12-12T21:45:00.001Z', endTime: '2025-12-12T21:45:05.799Z', parentObservationId: 'agent-mortal-parent', metadata: {} },
    { id: 'gen-display-mortal-1', traceId: 'def456ghi789', type: 'GENERATION', name: 'response', startTime: '2025-12-12T21:45:00.002Z', endTime: '2025-12-12T21:45:05.798Z', totalTokens: 950, promptTokens: 600, completionTokens: 350, calculatedTotalCost: 0.0033, model: 'gpt-5.1-2025-11-13', level: 'DEFAULT', parentObservationId: 'agent-display-mortal-1', metadata: {}, input: [{ role: 'user', content: 'Continue' }], output: { text: "Now displaying the mortal card for **Maya Brooks**...\n\n[Widget: MortalCard rendered]" } },

    // HasEnded - routing agent (fast, low cost) - 5 executions
    { id: 'has-ended-parent-1', traceId: 'trace-hasended-1', type: 'AGENT', name: 'Agent workflow', startTime: '2025-12-13T13:56:52.000Z', endTime: '2025-12-13T13:56:52.150Z', parentObservationId: null, metadata: {} },
    { id: 'has-ended-1', traceId: 'trace-hasended-1', type: 'AGENT', name: 'HasEnded', startTime: '2025-12-13T13:56:52.001Z', endTime: '2025-12-13T13:56:52.149Z', parentObservationId: 'has-ended-parent-1', metadata: {} },
    { id: 'gen-hasended-1', traceId: 'trace-hasended-1', type: 'GENERATION', name: 'response', startTime: '2025-12-13T13:56:52.002Z', endTime: '2025-12-13T13:56:52.148Z', totalTokens: 85, promptTokens: 60, completionTokens: 25, calculatedTotalCost: 0.00025, model: 'gpt-5.1-2025-11-13', level: 'DEFAULT', parentObservationId: 'has-ended-1', metadata: {} },
    { id: 'has-ended-parent-2', traceId: 'trace-hasended-2', type: 'AGENT', name: 'Agent workflow', startTime: '2025-12-13T13:55:00.000Z', endTime: '2025-12-13T13:55:00.120Z', parentObservationId: null, metadata: {} },
    { id: 'has-ended-2', traceId: 'trace-hasended-2', type: 'AGENT', name: 'HasEnded', startTime: '2025-12-13T13:55:00.001Z', endTime: '2025-12-13T13:55:00.119Z', parentObservationId: 'has-ended-parent-2', metadata: {} },
    { id: 'gen-hasended-2', traceId: 'trace-hasended-2', type: 'GENERATION', name: 'response', startTime: '2025-12-13T13:55:00.002Z', endTime: '2025-12-13T13:55:00.118Z', totalTokens: 90, promptTokens: 65, completionTokens: 25, calculatedTotalCost: 0.00028, model: 'gpt-5.1-2025-11-13', level: 'DEFAULT', parentObservationId: 'has-ended-2', metadata: {} },
    { id: 'has-ended-parent-3', traceId: 'trace-hasended-3', type: 'AGENT', name: 'Agent workflow', startTime: '2025-12-13T13:54:00.000Z', endTime: '2025-12-13T13:54:00.100Z', parentObservationId: null, metadata: {} },
    { id: 'has-ended-3', traceId: 'trace-hasended-3', type: 'AGENT', name: 'HasEnded', startTime: '2025-12-13T13:54:00.001Z', endTime: '2025-12-13T13:54:00.099Z', parentObservationId: 'has-ended-parent-3', metadata: {} },
    { id: 'gen-hasended-3', traceId: 'trace-hasended-3', type: 'GENERATION', name: 'response', startTime: '2025-12-13T13:54:00.002Z', endTime: '2025-12-13T13:54:00.098Z', totalTokens: 82, promptTokens: 58, completionTokens: 24, calculatedTotalCost: 0.00024, model: 'gpt-5.1-2025-11-13', level: 'DEFAULT', parentObservationId: 'has-ended-3', metadata: {} },
    { id: 'has-ended-parent-4', traceId: 'trace-hasended-4', type: 'AGENT', name: 'Agent workflow', startTime: '2025-12-13T13:53:00.000Z', endTime: '2025-12-13T13:53:00.130Z', parentObservationId: null, metadata: {} },
    { id: 'has-ended-4', traceId: 'trace-hasended-4', type: 'AGENT', name: 'HasEnded', startTime: '2025-12-13T13:53:00.001Z', endTime: '2025-12-13T13:53:00.129Z', parentObservationId: 'has-ended-parent-4', metadata: {} },
    { id: 'gen-hasended-4', traceId: 'trace-hasended-4', type: 'GENERATION', name: 'response', startTime: '2025-12-13T13:53:00.002Z', endTime: '2025-12-13T13:53:00.128Z', totalTokens: 88, promptTokens: 62, completionTokens: 26, calculatedTotalCost: 0.00026, model: 'gpt-5.1-2025-11-13', level: 'DEFAULT', parentObservationId: 'has-ended-4', metadata: {} },
    { id: 'has-ended-parent-5', traceId: 'trace-hasended-5', type: 'AGENT', name: 'Agent workflow', startTime: '2025-12-13T13:52:00.000Z', endTime: '2025-12-13T13:52:00.110Z', parentObservationId: null, metadata: {} },
    { id: 'has-ended-5', traceId: 'trace-hasended-5', type: 'AGENT', name: 'HasEnded', startTime: '2025-12-13T13:52:00.001Z', endTime: '2025-12-13T13:52:00.109Z', parentObservationId: 'has-ended-parent-5', metadata: {} },
    { id: 'gen-hasended-5', traceId: 'trace-hasended-5', type: 'GENERATION', name: 'response', startTime: '2025-12-13T13:52:00.002Z', endTime: '2025-12-13T13:52:00.108Z', totalTokens: 86, promptTokens: 61, completionTokens: 25, calculatedTotalCost: 0.00025, model: 'gpt-5.1-2025-11-13', level: 'DEFAULT', parentObservationId: 'has-ended-5', metadata: {} },

    // StartCupidGame - initialization agent - 5 executions
    { id: 'start-game-parent-1', traceId: 'trace-startgame-1', type: 'AGENT', name: 'Agent workflow', startTime: '2025-12-13T13:50:00.000Z', endTime: '2025-12-13T13:50:02.500Z', parentObservationId: null, metadata: {} },
    { id: 'start-game-1', traceId: 'trace-startgame-1', type: 'AGENT', name: 'StartCupidGame', startTime: '2025-12-13T13:50:00.001Z', endTime: '2025-12-13T13:50:02.499Z', parentObservationId: 'start-game-parent-1', metadata: {} },
    { id: 'gen-startgame-1', traceId: 'trace-startgame-1', type: 'GENERATION', name: 'response', startTime: '2025-12-13T13:50:00.002Z', endTime: '2025-12-13T13:50:02.498Z', totalTokens: 450, promptTokens: 300, completionTokens: 150, calculatedTotalCost: 0.0012, model: 'gpt-5.1-2025-11-13', level: 'DEFAULT', parentObservationId: 'start-game-1', metadata: {} },
    { id: 'start-game-parent-2', traceId: 'trace-startgame-2', type: 'AGENT', name: 'Agent workflow', startTime: '2025-12-13T12:50:00.000Z', endTime: '2025-12-13T12:50:02.300Z', parentObservationId: null, metadata: {} },
    { id: 'start-game-2', traceId: 'trace-startgame-2', type: 'AGENT', name: 'StartCupidGame', startTime: '2025-12-13T12:50:00.001Z', endTime: '2025-12-13T12:50:02.299Z', parentObservationId: 'start-game-parent-2', metadata: {} },
    { id: 'gen-startgame-2', traceId: 'trace-startgame-2', type: 'GENERATION', name: 'response', startTime: '2025-12-13T12:50:00.002Z', endTime: '2025-12-13T12:50:02.298Z', totalTokens: 480, promptTokens: 320, completionTokens: 160, calculatedTotalCost: 0.0013, model: 'gpt-5.1-2025-11-13', level: 'DEFAULT', parentObservationId: 'start-game-2', metadata: {} },
    { id: 'start-game-parent-3', traceId: 'trace-startgame-3', type: 'AGENT', name: 'Agent workflow', startTime: '2025-12-13T11:50:00.000Z', endTime: '2025-12-13T11:50:02.100Z', parentObservationId: null, metadata: {} },
    { id: 'start-game-3', traceId: 'trace-startgame-3', type: 'AGENT', name: 'StartCupidGame', startTime: '2025-12-13T11:50:00.001Z', endTime: '2025-12-13T11:50:02.099Z', parentObservationId: 'start-game-parent-3', metadata: {} },
    { id: 'gen-startgame-3', traceId: 'trace-startgame-3', type: 'GENERATION', name: 'response', startTime: '2025-12-13T11:50:00.002Z', endTime: '2025-12-13T11:50:02.098Z', totalTokens: 420, promptTokens: 280, completionTokens: 140, calculatedTotalCost: 0.0011, model: 'gpt-5.1-2025-11-13', level: 'DEFAULT', parentObservationId: 'start-game-3', metadata: {} },
    { id: 'start-game-parent-4', traceId: 'trace-startgame-4', type: 'AGENT', name: 'Agent workflow', startTime: '2025-12-13T10:50:00.000Z', endTime: '2025-12-13T10:50:02.600Z', parentObservationId: null, metadata: {} },
    { id: 'start-game-4', traceId: 'trace-startgame-4', type: 'AGENT', name: 'StartCupidGame', startTime: '2025-12-13T10:50:00.001Z', endTime: '2025-12-13T10:50:02.599Z', parentObservationId: 'start-game-parent-4', metadata: {} },
    { id: 'gen-startgame-4', traceId: 'trace-startgame-4', type: 'GENERATION', name: 'response', startTime: '2025-12-13T10:50:00.002Z', endTime: '2025-12-13T10:50:02.598Z', totalTokens: 500, promptTokens: 340, completionTokens: 160, calculatedTotalCost: 0.0014, model: 'gpt-5.1-2025-11-13', level: 'DEFAULT', parentObservationId: 'start-game-4', metadata: {} },
    { id: 'start-game-parent-5', traceId: 'trace-startgame-5', type: 'AGENT', name: 'Agent workflow', startTime: '2025-12-13T09:50:00.000Z', endTime: '2025-12-13T09:50:02.400Z', parentObservationId: null, metadata: {} },
    { id: 'start-game-5', traceId: 'trace-startgame-5', type: 'AGENT', name: 'StartCupidGame', startTime: '2025-12-13T09:50:00.001Z', endTime: '2025-12-13T09:50:02.399Z', parentObservationId: 'start-game-parent-5', metadata: {} },
    { id: 'gen-startgame-5', traceId: 'trace-startgame-5', type: 'GENERATION', name: 'response', startTime: '2025-12-13T09:50:00.002Z', endTime: '2025-12-13T09:50:02.398Z', totalTokens: 460, promptTokens: 310, completionTokens: 150, calculatedTotalCost: 0.0012, model: 'gpt-5.1-2025-11-13', level: 'DEFAULT', parentObservationId: 'start-game-5', metadata: {} },

    // DisplayChoices - UI agent for showing player options - 4 executions
    { id: 'display-choices-parent-1', traceId: 'trace-choices-1', type: 'AGENT', name: 'Agent workflow', startTime: '2025-12-13T13:55:44.000Z', endTime: '2025-12-13T13:55:47.500Z', parentObservationId: null, metadata: {} },
    { id: 'display-choices-1', traceId: 'trace-choices-1', type: 'AGENT', name: 'DisplayChoices', startTime: '2025-12-13T13:55:44.001Z', endTime: '2025-12-13T13:55:47.499Z', parentObservationId: 'display-choices-parent-1', metadata: {} },
    { id: 'gen-choices-1', traceId: 'trace-choices-1', type: 'GENERATION', name: 'response', startTime: '2025-12-13T13:55:44.002Z', endTime: '2025-12-13T13:55:47.498Z', totalTokens: 1200, promptTokens: 800, completionTokens: 400, calculatedTotalCost: 0.0035, model: 'gpt-5.1-2025-11-13', level: 'DEFAULT', parentObservationId: 'display-choices-1', metadata: {} },
    { id: 'display-choices-parent-2', traceId: 'trace-choices-2', type: 'AGENT', name: 'Agent workflow', startTime: '2025-12-13T13:55:08.000Z', endTime: '2025-12-13T13:55:10.800Z', parentObservationId: null, metadata: {} },
    { id: 'display-choices-2', traceId: 'trace-choices-2', type: 'AGENT', name: 'DisplayChoices', startTime: '2025-12-13T13:55:08.001Z', endTime: '2025-12-13T13:55:10.799Z', parentObservationId: 'display-choices-parent-2', metadata: {} },
    { id: 'gen-choices-2', traceId: 'trace-choices-2', type: 'GENERATION', name: 'response', startTime: '2025-12-13T13:55:08.002Z', endTime: '2025-12-13T13:55:10.798Z', totalTokens: 1150, promptTokens: 780, completionTokens: 370, calculatedTotalCost: 0.0032, model: 'gpt-5.1-2025-11-13', level: 'DEFAULT', parentObservationId: 'display-choices-2', metadata: {} },
    { id: 'display-choices-parent-3', traceId: 'trace-choices-3', type: 'AGENT', name: 'Agent workflow', startTime: '2025-12-13T13:54:40.000Z', endTime: '2025-12-13T13:54:43.200Z', parentObservationId: null, metadata: {} },
    { id: 'display-choices-3', traceId: 'trace-choices-3', type: 'AGENT', name: 'DisplayChoices', startTime: '2025-12-13T13:54:40.001Z', endTime: '2025-12-13T13:54:43.199Z', parentObservationId: 'display-choices-parent-3', metadata: {} },
    { id: 'gen-choices-3', traceId: 'trace-choices-3', type: 'GENERATION', name: 'response', startTime: '2025-12-13T13:54:40.002Z', endTime: '2025-12-13T13:54:43.198Z', totalTokens: 1280, promptTokens: 850, completionTokens: 430, calculatedTotalCost: 0.0038, model: 'gpt-5.1-2025-11-13', level: 'DEFAULT', parentObservationId: 'display-choices-3', metadata: {} },
    { id: 'display-choices-parent-4', traceId: 'trace-choices-4', type: 'AGENT', name: 'Agent workflow', startTime: '2025-12-13T13:54:26.000Z', endTime: '2025-12-13T13:54:28.500Z', parentObservationId: null, metadata: {} },
    { id: 'display-choices-4', traceId: 'trace-choices-4', type: 'AGENT', name: 'DisplayChoices', startTime: '2025-12-13T13:54:26.001Z', endTime: '2025-12-13T13:54:28.499Z', parentObservationId: 'display-choices-parent-4', metadata: {} },
    { id: 'gen-choices-4', traceId: 'trace-choices-4', type: 'GENERATION', name: 'response', startTime: '2025-12-13T13:54:26.002Z', endTime: '2025-12-13T13:54:28.498Z', totalTokens: 1100, promptTokens: 750, completionTokens: 350, calculatedTotalCost: 0.0030, model: 'gpt-5.1-2025-11-13', level: 'DEFAULT', parentObservationId: 'display-choices-4', metadata: {} },

    // CupidEvaluation - final evaluation agent - 1 execution
    { id: 'cupid-eval-parent', traceId: 'trace-eval-1', type: 'AGENT', name: 'Agent workflow', startTime: '2025-12-13T13:56:31.000Z', endTime: '2025-12-13T13:56:51.500Z', parentObservationId: null, metadata: {} },
    { id: 'cupid-eval-1', traceId: 'trace-eval-1', type: 'AGENT', name: 'CupidEvaluation', startTime: '2025-12-13T13:56:31.001Z', endTime: '2025-12-13T13:56:51.499Z', parentObservationId: 'cupid-eval-parent', metadata: {} },
    { id: 'gen-eval-1', traceId: 'trace-eval-1', type: 'GENERATION', name: 'response', startTime: '2025-12-13T13:56:31.002Z', endTime: '2025-12-13T13:56:51.498Z', totalTokens: 4500, promptTokens: 3200, completionTokens: 1300, calculatedTotalCost: 0.0125, model: 'gpt-5.1-2025-11-13', level: 'DEFAULT', parentObservationId: 'cupid-eval-1', metadata: {} },

    // End - game ending agent - 1 execution
    { id: 'end-parent', traceId: 'trace-end-1', type: 'AGENT', name: 'Agent workflow', startTime: '2025-12-13T13:56:52.200Z', endTime: '2025-12-13T13:56:58.000Z', parentObservationId: null, metadata: {} },
    { id: 'end-1', traceId: 'trace-end-1', type: 'AGENT', name: 'End', startTime: '2025-12-13T13:56:52.201Z', endTime: '2025-12-13T13:56:57.999Z', parentObservationId: 'end-parent', metadata: {} },
    { id: 'gen-end-1', traceId: 'trace-end-1', type: 'GENERATION', name: 'response', startTime: '2025-12-13T13:56:52.202Z', endTime: '2025-12-13T13:56:57.998Z', totalTokens: 2200, promptTokens: 1500, completionTokens: 700, calculatedTotalCost: 0.0058, model: 'gpt-5.1-2025-11-13', level: 'DEFAULT', parentObservationId: 'end-1', metadata: {} },
  ]
};

/**
 * Load JSON data from downloaded files
 * @returns {Promise<Object>} Loaded data
 */
async function loadJsonData() {
  if (LOADED_JSON_DATA) {
    return LOADED_JSON_DATA;
  }

  try {
    const response = await fetch('data/langfuse-data.json');
    if (!response.ok) {
      throw new Error(`Failed to load JSON data: ${response.status}`);
    }
    LOADED_JSON_DATA = await response.json();
    console.log(`Loaded JSON data: ${LOADED_JSON_DATA.sessions.length} sessions, ${LOADED_JSON_DATA.traces.length} traces, ${LOADED_JSON_DATA.observations.length} observations`);
    return LOADED_JSON_DATA;
  } catch (error) {
    console.warn('Failed to load JSON data, falling back to mock data:', error.message);
    LOADED_JSON_DATA = {
      sessions: MOCK_DATA.sessions,
      traces: MOCK_DATA.traces,
      observations: MOCK_DATA.observations,
      traceDetails: {}
    };
    return LOADED_JSON_DATA;
  }
}

/**
 * Base API client with authentication
 * Uses downloaded JSON data when USE_JSON_DATA is true
 */
class LangfuseAPI {
  constructor(config = LANGFUSE_CONFIG) {
    this.baseUrl = config.baseUrl;
    this.auth = btoa(`${config.publicKey}:${config.secretKey}`);
    this.jsonDataPromise = USE_JSON_DATA ? loadJsonData() : Promise.resolve(null);
  }

  /**
   * Make authenticated request to Langfuse API
   * When USE_JSON_DATA is true, returns data from JSON files instead
   */
  async request(endpoint, options = {}) {
    // Use JSON data if enabled
    if (USE_JSON_DATA) {
      await this.jsonDataPromise;
      return this.getJsonData(endpoint);
    }

    const url = `${this.baseUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        if (USE_MOCK_ON_ERROR) {
          console.warn(`API returned ${response.status}. Using mock data for: ${endpoint}`);
          return this.getMockData(endpoint);
        }
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.warn(`API request failed: ${error.message}. Using mock data.`);
      if (USE_MOCK_ON_ERROR) {
        return this.getMockData(endpoint);
      }
      throw error;
    }
  }

  /**
   * Get data from loaded JSON files
   */
  getJsonData(endpoint) {
    const data = LOADED_JSON_DATA;
    if (!data) {
      return this.getMockData(endpoint);
    }

    // Parse endpoint to extract filters
    const url = new URL(endpoint, 'http://localhost');
    const sessionIdFilter = url.searchParams.get('sessionId');

    if (endpoint.includes('/sessions')) {
      return {
        data: data.sessions,
        meta: { totalItems: data.sessions.length, totalPages: 1, page: 1, limit: 100 }
      };
    }

    if (endpoint.match(/\/traces\/[^?]/)) {
      // Single trace request
      const traceId = endpoint.split('/traces/')[1].split('?')[0];
      const traceDetail = data.traceDetails?.[traceId];
      if (traceDetail) {
        return traceDetail;
      }
      // Fallback to basic trace data
      const trace = data.traces.find(t => t.id === traceId);
      const observations = data.observations.filter(o => o.traceId === traceId);
      return { ...trace, observations };
    }

    if (endpoint.includes('/traces')) {
      let traces = data.traces;
      // Filter by sessionId if provided
      if (sessionIdFilter) {
        traces = traces.filter(t => t.sessionId === sessionIdFilter);
      }
      return {
        data: traces,
        meta: { totalItems: traces.length, totalPages: 1, page: 1, limit: 100 }
      };
    }

    if (endpoint.includes('/observations')) {
      const traceIdFilter = url.searchParams.get('traceId');
      let observations = data.observations;
      if (traceIdFilter) {
        observations = observations.filter(o => o.traceId === traceIdFilter);
      }
      return {
        data: observations,
        meta: { totalItems: observations.length, totalPages: 1, page: 1, limit: 500 }
      };
    }

    return { data: [], meta: { totalItems: 0, totalPages: 0, page: 1, limit: 50 } };
  }

  /**
   * Get mock data for an endpoint (fallback)
   */
  getMockData(endpoint) {
    if (endpoint.includes('/sessions')) {
      return { data: MOCK_DATA.sessions, meta: { totalItems: MOCK_DATA.sessions.length, totalPages: 1, page: 1, limit: 50 } };
    }
    if (endpoint.includes('/traces/')) {
      const traceId = endpoint.split('/traces/')[1];
      const trace = MOCK_DATA.traces.find(t => t.id === traceId) || MOCK_DATA.traces[0];
      const observations = MOCK_DATA.observations.filter(o => o.traceId === trace.id);
      return { ...trace, observations };
    }
    if (endpoint.includes('/traces')) {
      return { data: MOCK_DATA.traces, meta: { totalItems: MOCK_DATA.traces.length, totalPages: 1, page: 1, limit: 50 } };
    }
    if (endpoint.includes('/observations')) {
      return { data: MOCK_DATA.observations, meta: { totalItems: MOCK_DATA.observations.length, totalPages: 1, page: 1, limit: 50 } };
    }
    return { data: [], meta: { totalItems: 0, totalPages: 0, page: 1, limit: 50 } };
  }

  // ============================================
  // SESSIONS
  // ============================================

  /**
   * List all sessions
   * @param {Object} params - Query parameters
   * @param {number} params.limit - Max results (default 50)
   * @param {number} params.page - Page number (default 1)
   */
  async getSessions(params = {}) {
    const query = new URLSearchParams({
      limit: params.limit || 50,
      page: params.page || 1
    });
    return this.request(`/sessions?${query}`);
  }

  /**
   * Get traces for a specific session
   * @param {string} sessionId - Session ID
   */
  async getSessionTraces(sessionId) {
    const query = new URLSearchParams({
      sessionId,
      limit: 100
    });
    return this.request(`/traces?${query}`);
  }

  // ============================================
  // TRACES
  // ============================================

  /**
   * List traces with optional filters
   * @param {Object} params - Query parameters
   */
  async getTraces(params = {}) {
    const query = new URLSearchParams();

    if (params.limit) query.set('limit', params.limit);
    if (params.page) query.set('page', params.page);
    if (params.userId) query.set('userId', params.userId);
    if (params.sessionId) query.set('sessionId', params.sessionId);
    if (params.name) query.set('name', params.name);
    if (params.tags) query.set('tags', JSON.stringify(params.tags));

    return this.request(`/traces?${query}`);
  }

  /**
   * Get single trace with full details including nested observations
   * @param {string} traceId - Trace ID
   */
  async getTrace(traceId) {
    return this.request(`/traces/${traceId}`);
  }

  // ============================================
  // OBSERVATIONS
  // ============================================

  /**
   * List observations with filters
   * @param {Object} params - Query parameters
   */
  async getObservations(params = {}) {
    const query = new URLSearchParams();

    if (params.limit) query.set('limit', params.limit);
    if (params.page) query.set('page', params.page);
    if (params.traceId) query.set('traceId', params.traceId);
    if (params.type) query.set('type', params.type);
    if (params.name) query.set('name', params.name);
    if (params.parentObservationId) query.set('parentObservationId', params.parentObservationId);

    return this.request(`/observations?${query}`);
  }

  /**
   * Get single observation
   * @param {string} observationId - Observation ID
   */
  async getObservation(observationId) {
    return this.request(`/observations/${observationId}`);
  }

  // ============================================
  // SCORES
  // ============================================

  /**
   * List scores
   * @param {Object} params - Query parameters
   */
  async getScores(params = {}) {
    const query = new URLSearchParams({
      limit: params.limit || 50,
      page: params.page || 1
    });
    return this.request(`/scores?${query}`);
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get aggregated stats for all sessions
   */
  async getSessionsWithStats() {
    const sessions = await this.getSessions({ limit: 100 });

    // Fetch traces for each session to compute stats
    const sessionsWithStats = await Promise.all(
      sessions.data.map(async (session) => {
        const traces = await this.getSessionTraces(session.id);

        const stats = {
          traceCount: traces.data.length,
          totalCost: traces.data.reduce((sum, t) => sum + (t.totalCost || 0), 0),
          totalLatency: traces.data.reduce((sum, t) => sum + (t.latency || 0), 0),
          avgLatency: traces.data.length > 0
            ? traces.data.reduce((sum, t) => sum + (t.latency || 0), 0) / traces.data.length
            : 0,
          tags: [...new Set(traces.data.flatMap(t => t.tags || []))],
          users: [...new Set(traces.data.map(t => t.userId).filter(Boolean))],
          firstTrace: traces.data[traces.data.length - 1]?.timestamp,
          lastTrace: traces.data[0]?.timestamp
        };

        // Get metadata from first trace
        const firstTraceData = traces.data[0];
        const metadata = firstTraceData?.metadata || {};

        return {
          ...session,
          ...stats,
          mortal: metadata.mortal,
          match: metadata.match
        };
      })
    );

    return {
      data: sessionsWithStats,
      meta: sessions.meta
    };
  }

  /**
   * Get observations grouped by agent name
   * Fetches both AGENT and GENERATION observations, links them together,
   * and aggregates stats by the actual sub-agent names (not "Agent workflow")
   */
  async getAgentStats() {
    // Fetch all observations to build the parent-child relationship
    const allObservations = await this.getObservations({ limit: 500 });

    // Build a lookup map: observation ID -> observation
    const obsMap = new Map();
    for (const obs of allObservations.data) {
      obsMap.set(obs.id, obs);
    }

    // Find the parent agent name for a given observation
    const getParentAgentName = (obs) => {
      // If this is an AGENT observation, return its name (unless it's "Agent workflow")
      if (obs.type === 'AGENT' && obs.name !== 'Agent workflow') {
        return obs.name;
      }

      // Walk up the parent chain to find the nearest non-"Agent workflow" AGENT
      let current = obs;
      while (current.parentObservationId) {
        const parent = obsMap.get(current.parentObservationId);
        if (!parent) break;
        if (parent.type === 'AGENT' && parent.name !== 'Agent workflow') {
          return parent.name;
        }
        current = parent;
      }

      // Fallback: check metadata for graph.node.id
      return obs.metadata?.attributes?.['graph.node.id'] || null;
    };

    // Group by agent name
    const agentMap = new Map();

    // Process AGENT observations (for execution count and latency)
    for (const obs of allObservations.data) {
      if (obs.type === 'AGENT' && obs.name !== 'Agent workflow') {
        const agentName = obs.name;

        if (!agentMap.has(agentName)) {
          agentMap.set(agentName, {
            name: agentName,
            executions: 0,
            totalLatency: 0,
            totalCost: 0,
            totalTokens: 0,
            errors: 0,
            observations: []
          });
        }

        const agent = agentMap.get(agentName);
        agent.executions++;

        // Calculate latency from startTime/endTime
        if (obs.startTime && obs.endTime) {
          const latency = new Date(obs.endTime) - new Date(obs.startTime);
          agent.totalLatency += latency;
          obs.latency = latency; // Add for display
        }

        if (obs.level === 'ERROR') agent.errors++;
        agent.observations.push(obs);
      }
    }

    // Process GENERATION observations (for cost and tokens)
    for (const obs of allObservations.data) {
      if (obs.type === 'GENERATION') {
        const agentName = getParentAgentName(obs);
        if (!agentName) continue;

        const agent = agentMap.get(agentName);
        if (agent) {
          agent.totalCost += obs.calculatedTotalCost || 0;
          agent.totalTokens += obs.totalTokens || 0;

          // Also add latency from GENERATION if available
          if (obs.startTime && obs.endTime) {
            obs.latency = new Date(obs.endTime) - new Date(obs.startTime);
          }
        }
      }
    }

    // Calculate averages and sort by executions
    const agents = Array.from(agentMap.values())
      .map(agent => ({
        ...agent,
        avgLatency: agent.executions > 0 ? agent.totalLatency / agent.executions : 0,
        successRate: agent.executions > 0
          ? ((agent.executions - agent.errors) / agent.executions) * 100
          : 0
      }))
      .sort((a, b) => b.executions - a.executions);

    return agents;
  }

  /**
   * Build a tree structure from trace observations
   */
  buildObservationTree(observations) {
    const map = new Map();
    const roots = [];

    // Create map of all observations
    observations.forEach(obs => {
      map.set(obs.id, { ...obs, children: [] });
    });

    // Build tree
    observations.forEach(obs => {
      const node = map.get(obs.id);
      if (obs.parentObservationId && map.has(obs.parentObservationId)) {
        map.get(obs.parentObservationId).children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Sort children by start time
    const sortChildren = (node) => {
      node.children.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      node.children.forEach(sortChildren);
    };
    roots.forEach(sortChildren);

    return roots;
  }

  /**
   * Get full conversation transcript for a session
   * Returns messages with agent responses and user actions in chronological order
   * @param {string} sessionId - Session ID
   */
  async getSessionConversation(sessionId) {
    // Get all traces for this session
    const tracesResult = await this.getSessionTraces(sessionId);
    const traces = tracesResult.data;

    // Build observation lookup for parent resolution
    const obsMap = new Map();

    // Find the parent agent name for a given observation
    const getParentAgentName = (obs) => {
      if (obs.type === 'AGENT' && obs.name !== 'Agent workflow') {
        return obs.name;
      }
      let current = obs;
      while (current.parentObservationId) {
        const parent = obsMap.get(current.parentObservationId);
        if (!parent) break;
        if (parent.type === 'AGENT' && parent.name !== 'Agent workflow') {
          return parent.name;
        }
        current = parent;
      }
      return obs.metadata?.attributes?.['graph.node.id'] || 'Unknown';
    };

    const conversation = [];

    // Process each trace
    for (const trace of traces) {
      // Get full trace details with observations
      const traceDetail = await this.getTrace(trace.id);
      const observations = traceDetail.observations || [];

      // Build obsMap for this trace
      observations.forEach(obs => obsMap.set(obs.id, obs));

      // Extract GENERATION observations with input/output
      for (const obs of observations) {
        if (obs.type === 'GENERATION') {
          const agentName = getParentAgentName(obs);
          const chapter = trace.tags?.find(t => t.startsWith('chapter_'));

          // Calculate latency
          let latency = 0;
          if (obs.startTime && obs.endTime) {
            latency = new Date(obs.endTime) - new Date(obs.startTime);
          }

          // Extract user input if present
          if (obs.input) {
            const userInput = this._extractUserInput(obs.input);
            if (userInput) {
              conversation.push({
                type: 'user',
                timestamp: obs.startTime,
                chapter,
                traceId: trace.id,
                content: userInput
              });
            }
          }

          // Extract agent output
          if (obs.output) {
            const agentOutput = this._extractAgentOutput(obs.output);
            conversation.push({
              type: 'agent',
              timestamp: obs.endTime || obs.startTime,
              chapter,
              traceId: trace.id,
              agent: agentName,
              content: agentOutput,
              metadata: {
                latency,
                cost: obs.calculatedTotalCost || 0,
                tokens: obs.totalTokens || 0,
                promptTokens: obs.promptTokens || 0,
                completionTokens: obs.completionTokens || 0,
                model: obs.model
              }
            });
          }
        }
      }
    }

    // Sort by timestamp
    conversation.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Get session metadata from first trace
    const firstTrace = traces[0];
    const sessionMeta = {
      sessionId,
      mortal: firstTrace?.metadata?.mortal,
      match: firstTrace?.metadata?.match,
      chapters: [...new Set(traces.map(t => t.tags?.find(tag => tag.startsWith('chapter_'))).filter(Boolean))].sort(),
      totalCost: traces.reduce((sum, t) => sum + (t.totalCost || 0), 0),
      totalDuration: traces.length > 0
        ? new Date(traces[0].timestamp) - new Date(traces[traces.length - 1].timestamp)
        : 0
    };

    return { conversation, meta: sessionMeta };
  }

  /**
   * Extract user input from GENERATION input field
   */
  _extractUserInput(input) {
    if (!input) return null;

    // Input is typically an array of messages
    if (Array.isArray(input)) {
      // Filter only objects that have a role property
      const userMessages = input.filter(m => m && typeof m === 'object' && m.role === 'user');
      const lastUserMessage = userMessages.pop();
      if (lastUserMessage) {
        const content = lastUserMessage.content;
        // Content can be string or array of content items
        if (typeof content === 'string') {
          return content;
        }
        if (Array.isArray(content)) {
          // Extract text from content array items
          const texts = content
            .filter(c => c && (c.text || c.type === 'text'))
            .map(c => c.text || c.value || '');
          if (texts.length > 0) {
            return texts.join(' ');
          }
        }
        // Object content - try to extract meaningful text
        if (content && typeof content === 'object') {
          if (content.text) return content.text;
          if (content.value) return content.value;
          // For action objects, show the action type
          if (content.action) return content.action;
          if (content.choice) return `Choice: ${content.choice}`;
          // Don't show raw objects, just indicate user action
          return '[User action]';
        }
        return content;
      }
    }

    // Or it could be a string
    if (typeof input === 'string') {
      return input;
    }

    // Or it could be an object with content
    if (input && typeof input === 'object') {
      if (input.content) {
        if (typeof input.content === 'string') {
          return input.content;
        }
        // For objects, indicate user action
        return '[User action]';
      }
      // Direct object input - check for common fields
      if (input.text) return input.text;
      if (input.action) return input.action;
      if (input.choice) return `Choice: ${input.choice}`;
    }

    return null;
  }

  /**
   * Extract agent output from GENERATION output field
   * Handles various Langfuse/OpenAI output formats
   */
  _extractAgentOutput(output) {
    if (!output) return '';

    // Format 1: String directly
    if (typeof output === 'string') {
      return output;
    }

    // Format 2: { text: '...' }
    if (output.text && typeof output.text === 'string') {
      return output.text;
    }

    // Format 3: { content: '...' }
    if (output.content && typeof output.content === 'string') {
      return output.content;
    }

    // Format 4: OpenAI-style response { choices: [{ message: { content: '...' } }] }
    if (output.choices && Array.isArray(output.choices) && output.choices[0]?.message?.content) {
      return output.choices[0].message.content;
    }

    // Format 5: OpenAI Responses API format { output: [{ content: [{ text: '...' }] }] }
    // This is the format from real Langfuse API with OpenAI responses
    if (output.output && Array.isArray(output.output)) {
      const texts = [];
      for (const item of output.output) {
        // Skip reasoning items, only get message items with content
        if (item.content && Array.isArray(item.content)) {
          for (const contentItem of item.content) {
            if (contentItem.text && typeof contentItem.text === 'string') {
              texts.push(contentItem.text);
            }
          }
        }
      }
      if (texts.length > 0) {
        return texts.join('\n\n');
      }
    }

    // Format 6: Array of message objects [{ role: 'assistant', content: '...' }]
    if (Array.isArray(output)) {
      // Try to find assistant message
      const assistantMsg = output.find(m => m && m.role === 'assistant');
      if (assistantMsg?.content) {
        return typeof assistantMsg.content === 'string'
          ? assistantMsg.content
          : JSON.stringify(assistantMsg.content, null, 2);
      }
      // Or items with content array (OpenAI format)
      const textsFromArray = [];
      for (const item of output) {
        if (item?.content && Array.isArray(item.content)) {
          for (const c of item.content) {
            if (c?.text) textsFromArray.push(c.text);
          }
        }
      }
      if (textsFromArray.length > 0) {
        return textsFromArray.join('\n\n');
      }
      // Or just join all content strings
      const contents = output
        .filter(m => m && m.content)
        .map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content));
      if (contents.length > 0) {
        return contents.join('\n\n');
      }
    }

    // Format 7: Nested message { message: { content: '...' } }
    if (output.message?.content) {
      return typeof output.message.content === 'string'
        ? output.message.content
        : JSON.stringify(output.message.content, null, 2);
    }

    // Format 8: Empty object {} - just return empty string, don't warn
    if (typeof output === 'object' && Object.keys(output).length === 0) {
      return '';
    }

    // Last resort: stringify with warning
    console.warn('Unknown output format, stringifying:', output);
    try {
      return typeof output === 'object' ? JSON.stringify(output, null, 2) : String(output);
    } catch {
      return '[Unable to display output]';
    }
  }

  /**
   * Check if a session/conversation is complete
   * A complete game has: End agent execution OR chapter_5/chapter_6
   * @param {Array} conversation - Array of conversation messages
   * @param {Object} meta - Session metadata with chapters array
   * @returns {boolean}
   */
  isCompleteSession(conversation, meta) {
    // Check for End agent in conversation
    const hasEndAgent = conversation.some(msg => msg.agent === 'End');
    if (hasEndAgent) return true;

    // Check for chapter 5 or 6 in tags
    if (meta?.chapters) {
      const hasLateChapter = meta.chapters.some(ch =>
        ch === 'chapter_5' || ch === 'chapter_6' ||
        parseInt(ch.replace('chapter_', '')) >= 5
      );
      if (hasLateChapter) return true;
    }

    return false;
  }

  /**
   * Get the maximum chapter number reached in a session
   * @param {Object} meta - Session metadata with chapters array
   * @returns {number} - Highest chapter number (0-6+), or -1 if none
   */
  getMaxChapter(meta) {
    if (!meta?.chapters || meta.chapters.length === 0) return -1;

    let maxChapter = -1;
    for (const ch of meta.chapters) {
      const num = parseInt(ch.replace('chapter_', ''));
      if (!isNaN(num) && num > maxChapter) {
        maxChapter = num;
      }
    }
    return maxChapter;
  }

  /**
   * Get a human-readable progress label for a session
   * @param {Array} conversation - Array of conversation messages
   * @param {Object} meta - Session metadata
   * @returns {Object} - { label: string, isComplete: boolean, chapter: number }
   */
  getSessionProgress(conversation, meta) {
    const isComplete = this.isCompleteSession(conversation, meta);
    const maxChapter = this.getMaxChapter(meta);

    if (isComplete) {
      return { label: 'Complete', isComplete: true, chapter: maxChapter };
    }

    if (maxChapter >= 0) {
      const chapterNames = {
        0: 'Introduction',
        1: 'Meet the Mortal',
        2: 'Meet the Match',
        3: 'Compatibility',
        4: 'The Story',
        5: 'Evaluation',
        6: 'End'
      };
      const name = chapterNames[maxChapter] || `Chapter ${maxChapter}`;
      return { label: `Made it to: ${name}`, isComplete: false, chapter: maxChapter };
    }

    return { label: 'Just Started', isComplete: false, chapter: -1 };
  }

  /**
   * Get users with their sessions grouped together
   * Returns array of user objects, each with their sessions and aggregate stats
   */
  async getUsersWithSessions() {
    const [sessions, traces] = await Promise.all([
      this.getSessions({ limit: 100 }),
      this.getTraces({ limit: 500 })
    ]);

    const userMap = new Map();

    // Build user -> sessions mapping from traces
    for (const trace of traces.data) {
      const userId = trace.userId;
      const sessionId = trace.sessionId;
      if (!userId || !sessionId) continue;

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          sessions: new Map(),
          totalCost: 0,
          totalLatency: 0,
          traceCount: 0,
          firstSeen: trace.timestamp,
          lastActive: trace.timestamp
        });
      }

      const user = userMap.get(userId);
      user.traceCount++;
      user.totalCost += trace.totalCost || 0;
      user.totalLatency += trace.latency || 0;

      // Track first/last timestamps
      if (new Date(trace.timestamp) < new Date(user.firstSeen)) {
        user.firstSeen = trace.timestamp;
      }
      if (new Date(trace.timestamp) > new Date(user.lastActive)) {
        user.lastActive = trace.timestamp;
      }

      // Add session to user
      if (!user.sessions.has(sessionId)) {
        const sessionData = sessions.data.find(s => s.id === sessionId) || { id: sessionId };
        user.sessions.set(sessionId, {
          ...sessionData,
          traces: [],
          mortal: null,
          match: null,
          tags: []
        });
      }
      const session = user.sessions.get(sessionId);
      session.traces.push(trace);

      // Extract mortal/match from trace metadata
      if (trace.metadata?.mortal) {
        session.mortal = trace.metadata.mortal;
      }
      if (trace.metadata?.match) {
        session.match = trace.metadata.match;
      }
      // Collect tags
      if (trace.tags) {
        session.tags = [...new Set([...session.tags, ...trace.tags])];
      }
    }

    // Convert to array and compute stats
    const users = Array.from(userMap.values()).map(user => ({
      ...user,
      sessions: Array.from(user.sessions.values()),
      sessionCount: user.sessions.size,
      avgLatency: user.traceCount > 0 ? user.totalLatency / user.traceCount : 0
    }));

    // Sort by last active (most recent first)
    users.sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));

    return {
      data: users,
      meta: {
        totalUsers: users.length,
        totalSessions: users.reduce((sum, u) => sum + u.sessionCount, 0),
        totalTraces: traces.data.length
      }
    };
  }

  /**
   * Get aggregate metrics for dashboard
   */
  async getDashboardMetrics() {
    const [traces, sessions] = await Promise.all([
      this.getTraces({ limit: 500 }),
      this.getSessions({ limit: 100 })
    ]);

    const now = new Date();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    // Calculate metrics
    const totalTraces = traces.meta.totalItems;
    const totalSessions = sessions.meta.totalItems;
    const totalCost = traces.data.reduce((sum, t) => sum + (t.totalCost || 0), 0);
    const avgLatency = traces.data.length > 0
      ? traces.data.reduce((sum, t) => sum + (t.latency || 0), 0) / traces.data.length
      : 0;

    // Group by day for charts
    const tracesByDay = {};
    const costByDay = {};
    traces.data.forEach(trace => {
      const day = trace.timestamp.split('T')[0];
      tracesByDay[day] = (tracesByDay[day] || 0) + 1;
      costByDay[day] = (costByDay[day] || 0) + (trace.totalCost || 0);
    });

    // Get unique users
    const uniqueUsers = new Set(traces.data.map(t => t.userId).filter(Boolean));

    return {
      totalTraces,
      totalSessions,
      totalCost,
      avgLatency,
      uniqueUsers: uniqueUsers.size,
      tracesByDay,
      costByDay,
      traces: traces.data
    };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format cost in USD
 */
function formatCost(cost) {
  if (cost === null || cost === undefined) return '-';
  return `$${cost.toFixed(4)}`;
}

/**
 * Format latency in seconds/milliseconds
 */
function formatLatency(ms) {
  if (ms === null || ms === undefined) return '-';
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${ms.toFixed(0)}ms`;
}

/**
 * Format token count
 */
function formatTokens(tokens) {
  if (tokens === null || tokens === undefined) return '-';
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

/**
 * Format relative time
 */
function formatRelativeTime(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

/**
 * Format duration between two timestamps
 */
function formatDuration(start, end) {
  if (!start || !end) return '-';
  const diff = new Date(end) - new Date(start);
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Truncate text with ellipsis
 */
function truncate(text, maxLength = 50) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Get observation type color class
 */
function getTypeColor(type) {
  const colors = {
    'TRACE': 'purple',
    'AGENT': 'purple',
    'GENERATION': 'info',
    'TOOL': 'success',
    'SPAN': 'secondary'
  };
  return colors[type] || 'secondary';
}

/**
 * Parse URL parameters
 */
function getUrlParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search));
}

/**
 * Set URL parameter without page reload
 */
function setUrlParam(key, value) {
  const url = new URL(window.location);
  if (value) {
    url.searchParams.set(key, value);
  } else {
    url.searchParams.delete(key);
  }
  window.history.pushState({}, '', url);
}

// Export for use in pages
window.LangfuseAPI = LangfuseAPI;
window.formatCost = formatCost;
window.formatLatency = formatLatency;
window.formatTokens = formatTokens;
window.formatRelativeTime = formatRelativeTime;
window.formatDuration = formatDuration;
window.truncate = truncate;
window.getTypeColor = getTypeColor;
window.getUrlParams = getUrlParams;
window.setUrlParam = setUrlParam;
