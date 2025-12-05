Flow has been this: We made from a node-based editor Agent Builder OpenAI's Agent Builder A storytelling workflow for the game Cupid.

You can see a screenshot of that here:

`/Users/johnsteven/GITHUB/CHATKIT/chatkit-dev-00/specs/cupid/cupid-agent-builder.png`

This is the python workflow Agentkit Output.

`/Users/johnsteven/GITHUB/CHATKIT/chatkit-dev-00/specs/cupid/workflows/cupid-workflow.md`

(
We extracted the agent instruction and put them in individual files for separation and ease of editing, here:
`/Users/johnsteven/GITHUB/CHATKIT/chatkit-dev-00/specs/cupid/instructions/`
)

WE have since, impoemtned the entire app here. It is an alpha.

I want you to make a diagram of the workflow for each agent.

For each agent:

agent:
name: str
instructions: <path/to/file.md>
model: (gpt-5.1)
reasoning: [none, low, medium, high, not indicated]
output-format: [low, medium, high]
verbosity: [detailed, auto, null]
display-response-in-chat: bool
show-in-progress=messages: bool
show-search-sources: bool
continue-on-error: bool
write-to-conversation-history: bool
context: <vars>
links-to: [node ...]

So that we have a whole accruate diagram of THE CODE AS IT IS IMPLEMENTED.

please include in a format fitting this diagram any control nodes, or state or var nodes.

First evaluate the best kind of diagram we could make for this, and then let's make it. It's important that you treat the code in apps/cupid as the SOURCE OF TRUTH. You must absolutely be accurate with this.
