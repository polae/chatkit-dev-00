you can see in the very large file'/Users/johnsteven/GITHUB/CHATKIT/chatkit-dev-00/specs/cupid/workflows/cupid-workflow.md' we have imported teh code from agent
builder. THis includes ALL the instructions. We want to extract the instruction and instead use the instructions files (which shoudl be exactly the same).

WE want to make changes to this file: '/Users/johnsteven/GITHUB/CHATKIT/chatkit-dev-00/specs/cupid/workflows/cupid-workflow.md'

And want to remove the instructions like the file:

'/Users/johnsteven/GITHUB/CHATKIT/chatkit-dev-00/specs/cupid-simple/workflows/cupid-simple-workflow.md'\

remove the promts and laod them from indivudal files.

As i have been working in agent builder, I have been editing the files in specs/cupid/instructions/

These shoudl be identical to the prompts in the workfdlow file.

Please jsut double check that they are the same, and then load them in. They shoudl where appropriate include the state variable or varibel refences need for the workflow. You do not need to hcange these as they will be picked up by the process. However, these caaribale will be passed in RunContext (see the cupid-simple app) so do follow the exmaple there. \
\
Make sure that you are not changing the code, jsut extracting the instructions. Does this make sense?

It's my hope that we are just adding a few instruction setes (mostly small or techincal, and keeping the files we already have, but we must ensure they're the
same. Keeping these in files will make it much much easire to work with and spearate prompt writing from coding.
\
let's be careful.
