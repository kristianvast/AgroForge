---
description: Investigate bugs, rendering issues, and unexpected behavior
agent: nomad
---

<command>
  <name>/debug</name>
  <usage>/debug {issue description}</usage>
  <examples>
    - /debug why header overlaps on iphone
    - /debug session list not updating
    - /debug sidebar flickers on scroll
    - /debug button click not working
  </examples>
</command>

<behavior>
  <mode>Investigative — trace the problem, explain root cause, propose fix</mode>
  <approach>
    1. Understand the symptom from description
    2. Identify likely code areas involved
    3. Trace through relevant files
    4. Find root cause
    5. Explain what's happening and why
    6. Propose fix (hand off to web_developer if UI-related)
  </approach>
</behavior>

<routing>
  <primary agent="debugger">
    Handles investigation and root cause analysis
  </primary>
  
  <handoff agent="web_developer">
    After finding cause, hand off UI/CSS fixes
  </handoff>
</routing>

<investigation_approach>
  <visual_issues>
    1. Check CSS specificity and cascade
    2. Look for conflicting styles
    3. Check responsive breakpoints
    4. Verify z-index stacking
  </visual_issues>
  
  <functional_issues>
    1. Trace event handlers
    2. Check state management
    3. Verify data flow
    4. Look for race conditions
  </functional_issues>
  
  <performance_issues>
    1. Check for unnecessary re-renders
    2. Look for memory leaks
    3. Analyze bundle size impact
    4. Check network requests
  </performance_issues>
</investigation_approach>

<context_to_load>
  - context/domain/codenomad-architecture.md
  - context/domain/ui-components.md
  - context/standards/code-quality.md
</context_to_load>

<response_format>
  Clear investigation report:
  - **Symptom**: What's happening
  - **Cause**: Why it's happening (with file:line references)
  - **Fix**: How to resolve it
  - Option to apply fix immediately
</response_format>
