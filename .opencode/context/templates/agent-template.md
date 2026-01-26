# Agent Template

## Basic Agent Structure

```markdown
---
description: Brief description of what this agent does.
mode: all
---

<identity>
  <name>Agent Name</name>
  <role>One-line description of role</role>
  <expertise>Key skills and knowledge areas</expertise>
</identity>

<capabilities>
  <capability_1>What this agent can do</capability_1>
  <capability_2>Another capability</capability_2>
</capabilities>

<project_knowledge>
  <key_paths>
    <important_dir>path/to/files</important_dir>
  </key_paths>
  
  <patterns>
    Key patterns this agent should follow
  </patterns>
</project_knowledge>

<workflow>
  <step_1>First step in typical task</step_1>
  <step_2>Second step</step_2>
  <step_3>Validation/completion</step_3>
</workflow>

<response_format>
  How the agent should format its responses:
  1. Brief summary
  2. Key details
  3. Any follow-up
</response_format>
```

## Orchestrator Template

```markdown
---
description: Routes requests to specialist agents.
mode: all
---

<identity>
  <name>Orchestrator Name</name>
  <role>Route requests to appropriate specialists</role>
</identity>

<routing_logic>
  <analyze_prompt>
    1. Parse keywords and intent
    2. Assess complexity
    3. Determine target agent(s)
  </analyze_prompt>
  
  <route_to_agent>
    <agent_a>
      triggers: keyword1, keyword2, keyword3
      examples: "example prompt 1", "example prompt 2"
    </agent_a>
    
    <agent_b>
      triggers: keyword4, keyword5
      examples: "example prompt 3"
    </agent_b>
  </route_to_agent>
</routing_logic>

<clarification_rules>
  <ask_when>
    - Ambiguous request
    - High-risk operation
  </ask_when>
  
  <dont_ask_when>
    - Clear intent
    - Low-risk change
  </dont_ask_when>
</clarification_rules>

<available_agents>
  <agent name="agent_a" path="agent/subagents/agent-a.md">
    Description of agent A
  </agent>
  <agent name="agent_b" path="agent/subagents/agent-b.md">
    Description of agent B
  </agent>
</available_agents>
```

## Specialist Agent Template

```markdown
---
description: Specialist for specific domain/task.
mode: all
---

<identity>
  <name>Specialist Name</name>
  <role>Domain-specific specialist</role>
  <expertise>Specific skills, tools, patterns</expertise>
</identity>

<capabilities>
  <primary>Main thing this agent does</primary>
  <secondary>Supporting capabilities</secondary>
</capabilities>

<domain_knowledge>
  <file_locations>
    Where relevant files are
  </file_locations>
  
  <patterns>
    Patterns to follow
  </patterns>
  
  <common_issues>
    <issue_type_1>
      Symptom: What it looks like
      Cause: Why it happens
      Fix: How to resolve
    </issue_type_1>
  </common_issues>
</domain_knowledge>

<workflow>
  <receive>Understand the request</receive>
  <analyze>Examine current state</analyze>
  <implement>Make changes</implement>
  <validate>Verify results</validate>
</workflow>

<handoff>
  When to hand off to other agents:
  - Condition 1 → agent_x
  - Condition 2 → agent_y
</handoff>

<response_format>
  Brief, actionable output:
  1. What was done
  2. Key changes (code/diff)
  3. Next steps if any
</response_format>
```

## Command Template

```markdown
---
description: What this command does.
agent: which_agent_handles_it
---

# /command-name

## Usage
/command-name [required_arg] [optional_arg]

## Examples
/command-name example1
/command-name example2 --flag

## Behavior
What the command does when invoked.

## Parameters
- `required_arg`: Description
- `optional_arg`: Description (default: value)
```

## Checklist

When creating a new agent:

- [ ] Clear identity (name, role, expertise)
- [ ] Capabilities defined
- [ ] Project knowledge included (paths, patterns)
- [ ] Workflow steps documented
- [ ] Response format specified
- [ ] Brevity instructions (avoid verbosity)
- [ ] Handoff rules (when to pass to other agents)
- [ ] Error handling guidance
