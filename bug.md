⏺ I see the issue - you set the output style to "default" but the statusline still shows "Learning". This appears to be a bug or limitation in Claude Code where the statusline JSON isn't refreshed immediately after /output-style changes.

The statusline only updates when the conversation state changes (like when I respond). Let me add that debug line back temporarily to check if the JSON has been updated now:

⏺ Update(~/.claude/statusline.sh)
⎿ Updated ../../../.claude/statusline.sh with 1 addition  
 1 #!/bin/bash
2 input=$(cat)
       3 +  echo "$input" > /tmp/statusline_debug.json
4  
 5 workdir=$(basename "$(echo "$input" | jq -r '.workspace.current_dir')")
       6    model=$(echo "$input" | jq -r '.model.display_name' | sed 's/Claude 3.5 Sonnet/Sonnet 3.5/g' | sed 's/Claude Sonnet 4.5/Sonnet 4.5/g')

⏺ Bash(cat /tmp/statusline_debug.json | jq '.output_style')
⎿ {  
 "name": "Learning"
}

⏺ The JSON still shows "Learning" even though you ran /output-style and it said "Set output style to default". This confirms the bug is in Claude Code itself - the /output-style command displays the confirmation but the internal state (passed to the statusline) isn't being updated properly.

This is a Claude Code bug where the output style change isn't propagating to the statusline JSON data. Your statusline script is correct - it's just not receiving the updated value.

You could report this issue at https://github.com/anthropics/claude-code/issues

Let me clean up the debug line:

⏺ Update(~/.claude/statusline.sh)
⎿ Updated ../../../.claude/statusline.sh with 1 removal  
 1 #!/bin/bash
2 input=$(cat)
       3 -  echo "$input" > /tmp/statusline_debug.json
3  
 4 workdir=$(basename "$(echo "$input" | jq -r '.workspace.current_dir')")
       5    model=$(echo "$input" | jq -r '.model.display_name' | sed 's/Claude 3.5 Sonnet/Sonnet 3.5/g' | sed 's/Claude Sonnet 4.5/Sonnet 4.5/g')

⏺ Summary: This is a Claude Code bug. The /output-style command changes the style but doesn't update the JSON data passed to the statusline script. Your statusline configuration is correct - the issue is upstream in Claude Code itself.
