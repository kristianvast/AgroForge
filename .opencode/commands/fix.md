---
description: Quick fix mode - rapidly fix UI, mobile, or code issues
agent: nomad
---

<command>
  <name>/fix</name>
  <usage>/fix {target}</usage>
  <examples>
    - /fix mobile menu
    - /fix sidebar overflow
    - /fix button alignment
    - /fix header on iphone
  </examples>
</command>

<behavior>
  <mode>Autonomous — just fix it, show results</mode>
  <approach>
    1. Identify what needs fixing from the target description
    2. Locate relevant files in codebase
    3. Analyze the issue (visual, functional, or both)
    4. Apply fix using existing patterns
    5. Show before/after or diff
  </approach>
</behavior>

<routing>
  <primary agent="web_developer">
    When: CSS, layout, responsive, visual issues
    Examples: "fix mobile menu", "fix sidebar width", "fix button styling"
  </primary>
  
  <primary agent="debugger">
    When: Functional bugs, unexpected behavior, errors
    Examples: "fix session not loading", "fix click handler", "fix state sync"
  </primary>
  
  <fallback>
    If unclear, start with web_developer (most /fix requests are visual)
  </fallback>
</routing>

<context_to_load>
  - context/domain/ui-components.md (for component fixes)
  - context/domain/styling-system.md (for CSS fixes)
  - context/standards/mobile-compatibility.md (for mobile fixes)
</context_to_load>

<response_format>
  Brief and visual:
  - Show what was fixed
  - Display diff or before/after
  - Mention any related issues noticed
</response_format>
