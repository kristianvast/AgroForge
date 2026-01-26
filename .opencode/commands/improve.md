---
description: Make something better - enhance UI, UX, or code quality
agent: nomad
---

<command>
  <name>/improve</name>
  <usage>/improve {target}</usage>
  <examples>
    - /improve sidebar
    - /improve mobile navigation
    - /improve session list design
    - /improve button consistency
  </examples>
</command>

<behavior>
  <mode>Semi-autonomous — improve then show options if multiple approaches</mode>
  <approach>
    1. Understand what "better" means for this target
    2. Analyze current implementation
    3. Identify improvement opportunities (visual, UX, performance, code)
    4. Apply improvements using project standards
    5. Present changes with rationale
  </approach>
</behavior>

<routing>
  <primary agent="web_developer">
    Handles all /improve requests — this is about making things better visually and functionally
  </primary>
</routing>

<improvement_types>
  <visual>Better spacing, alignment, colors, typography</visual>
  <ux>Better interactions, feedback, accessibility</ux>
  <responsive>Better mobile/tablet adaptation</responsive>
  <consistency>Align with existing design patterns</consistency>
  <code>Cleaner structure, better organization</code>
</improvement_types>

<context_to_load>
  - context/domain/ui-components.md
  - context/domain/styling-system.md
  - context/standards/visual-standards.md
  - context/standards/code-quality.md
</context_to_load>

<response_format>
  Show the improvement:
  - What was changed and why
  - Visual diff or screenshots if applicable
  - Optional: "Want me to also improve X?" if related opportunities found
</response_format>
