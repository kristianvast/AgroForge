---
description: Fix or improve agent behavior and prompts
agent: nomad
---

<command>
  <name>/agent</name>
  <usage>/agent {agent_name} {issue or improvement}</usage>
  <examples>
    - /agent web_developer is too verbose
    - /agent nomad keeps asking unnecessary questions
    - /agent debugger should check console errors first
    - /agent device_tester needs better checklist
  </examples>
</command>

<behavior>
  <mode>Analytical — understand the issue, propose fix, apply after confirmation</mode>
  <approach>
    1. Identify which agent file to modify
    2. Understand the behavioral issue or improvement
    3. Analyze current prompt/instructions
    4. Propose specific changes
    5. Apply changes after confirmation
    6. Test with example prompt
  </approach>
</behavior>

<routing>
  <primary agent="agent_fixer">
    Handles all agent improvement requests
  </primary>
</routing>

<available_agents>
  <agent name="nomad" path=".opencode/agent/nomad.md">Main orchestrator</agent>
  <agent name="web_developer" path=".opencode/agent/web_developer.md">UI specialist</agent>
  <agent name="device_tester" path=".opencode/agent/subagents/device_tester.md">Mobile testing</agent>
  <agent name="agent_fixer" path=".opencode/agent/subagents/agent_fixer.md">Agent improvement</agent>
  <agent name="debugger" path=".opencode/agent/subagents/debugger.md">Bug investigation</agent>
</available_agents>

<common_improvements>
  <verbosity>Adjust response length and detail level</verbosity>
  <routing>Fix incorrect task routing</routing>
  <clarification>Reduce unnecessary questions</clarification>
  <context>Add missing knowledge or patterns</context>
  <behavior>Change how agent approaches tasks</behavior>
</common_improvements>

<context_to_load>
  - context/processes/agent-tuning-flow.md
  - context/templates/agent-template.md
</context_to_load>

<response_format>
  Structured improvement:
  - Current behavior (what's wrong)
  - Proposed change (what to fix)
  - Diff of agent file changes
  - "Apply this change?" confirmation
</response_format>
