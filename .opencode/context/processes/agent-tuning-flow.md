# Agent Tuning Flow

## Overview
Process for fixing and improving agent behavior in CodeNomad.

## When to Use

- Agent produces wrong output
- Agent is too verbose or too terse
- Agent asks too many questions (or too few)
- Agent doesn't follow project patterns
- Routing sends requests to wrong agent

## Workflow Stages

### 1. Identify the Problem

**Capture the symptom**:
- What is the agent doing?
- What should it be doing?
- Is it consistent or intermittent?
- Specific inputs that trigger it?

**Example problems**:
- "web_developer keeps explaining instead of just fixing"
- "nomad routes mobile issues to debugger instead of web_developer"
- "agent_fixer doesn't know where agent files are"

### 2. Locate the Source

**Agent files**:
```
.opencode/agent/nomad.md              # Main orchestrator
.opencode/agent/web_developer.md      # UI specialist
.opencode/agent/subagents/            # Other specialists
```

**Related files**:
```
.opencode/context/                    # Knowledge files
.opencode/commands/                   # Command definitions
```

**Read the current prompt**:
- What instructions exist?
- Any conflicting guidance?
- Missing information?

### 3. Diagnose the Cause

**Common causes**:

| Symptom | Likely Cause |
|---------|--------------|
| Wrong behavior | Unclear/missing instruction |
| Inconsistent behavior | Ambiguous instructions |
| Wrong routing | Overlapping trigger keywords |
| Missing context | Context file not loaded |
| Too verbose | No brevity instruction |
| Too cautious | Autonomy level too low |

**Ask diagnostic questions**:
- Is the instruction there but unclear?
- Is it missing entirely?
- Is there a conflicting instruction?
- Is context being loaded?

### 4. Apply the Fix

**Principles**:
- Minimal changes (don't rewrite entire prompt)
- Be explicit (avoid ambiguity)
- Add examples if behavior needs demonstration
- Preserve what's working

**Fix patterns**:

**For unclear behavior**:
```xml
<!-- Before -->
<instruction>Help with UI tasks</instruction>

<!-- After -->
<instruction>
  Fix UI issues by making targeted code changes.
  Show the code diff, not lengthy explanations.
</instruction>
```

**For routing issues**:
```xml
<!-- Make triggers more specific -->
<route_to_agent>
  <web_developer>
    triggers: mobile, responsive, css, component, visual
    NOT: why, investigate, debug (these go to debugger)
  </web_developer>
</route_to_agent>
```

**For verbosity**:
```xml
<response_style>
  Keep responses brief:
  - 1-2 sentence summary
  - Code diff or key change
  - No lengthy explanations
</response_style>
```

**For missing context**:
```xml
<context_loading>
  Always load for UI tasks:
  - context/domain/ui-components.md
  - context/standards/visual-standards.md
</context_loading>
```

### 5. Test the Fix

**Test the original case**:
- Run the prompt that was failing
- Verify it now produces expected output

**Test related cases**:
- Similar prompts that should work the same
- Edge cases near the boundary

**Test for regressions**:
- Other common use cases still work
- Routing still correct

### 6. Document

**If significant change**:
- Note what was changed and why
- Update any related documentation
- Consider if pattern applies elsewhere

## Quick Reference: Fix Recipes

### Agent Too Verbose
Add explicit brevity instructions:
```xml
<response_format>
  Brief output only:
  1. What changed (1 line)
  2. Code diff
  3. Done
</response_format>
```

### Agent Asks Too Many Questions
Raise autonomy, narrow question triggers:
```xml
<clarification_rules>
  <ask_only_when>
    - Request could mean VERY different things
    - High-risk change (deleting, major refactor)
  </ask_only_when>
  <dont_ask_when>
    - Can make reasonable assumption
    - Low-risk change
    - Similar pattern exists to follow
  </dont_ask_when>
</clarification_rules>
```

### Wrong Agent Gets Request
Adjust routing keywords, add negative triggers:
```xml
<web_developer>
  triggers: visual, css, layout, styling, mobile UI
  NOT triggers: why, broken, investigate, trace
</web_developer>

<debugger>
  triggers: why, broken, investigate, trace, bug
</debugger>
```

### Agent Missing Context
Explicit context loading instructions:
```xml
<required_context>
  Before any UI task, load:
  - context/domain/ui-components.md
  - context/domain/styling-system.md
</required_context>
```
