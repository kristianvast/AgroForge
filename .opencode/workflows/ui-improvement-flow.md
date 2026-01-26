# UI Improvement Workflow

<workflow>
  <name>ui-improvement-flow</name>
  <purpose>Systematically enhance UI components for better design, UX, and code quality</purpose>
  <trigger>/improve command, design enhancement requests, UX feedback</trigger>
</workflow>

<stages>
  <stage id="1" name="Understand">
    <description>Clarify what "better" means for this request</description>
    <actions>
      - Parse the improvement request
      - Identify target component(s)
      - Determine improvement type (visual, UX, consistency, performance)
      - Check existing patterns for reference
      - Note any constraints or requirements
    </actions>
    <improvement_types>
      - **Visual**: Spacing, alignment, colors, typography, shadows
      - **UX**: Interactions, feedback, loading states, error handling
      - **Consistency**: Match existing design patterns
      - **Responsive**: Better adaptation across screen sizes
      - **Code**: Cleaner structure, less duplication, better organization
    </improvement_types>
    <outputs>
      - Clear improvement goals
      - Target files identified
      - Reference patterns noted
    </outputs>
  </stage>

  <stage id="2" name="Design">
    <description>Plan the improvements before implementing</description>
    <actions>
      - Review current implementation
      - Identify specific changes needed
      - Check visual-standards.md for design guidelines
      - Look for similar components to maintain consistency
      - Consider mobile implications
    </actions>
    <design_considerations>
      - Spacing: Use token-based spacing (--spacing-*)
      - Colors: Use semantic color tokens
      - Typography: Follow type scale
      - Interactions: Consistent hover/focus/active states
      - Accessibility: Maintain/improve a11y
    </design_considerations>
    <outputs>
      - Improvement plan
      - Expected visual/behavioral changes
    </outputs>
  </stage>

  <stage id="3" name="Implement">
    <description>Apply improvements following project standards</description>
    <actions>
      - Make CSS/component changes
      - Use existing tokens and utilities
      - Follow AGENTS.md styling guidelines
      - Keep changes focused and minimal
      - Preserve existing functionality
    </actions>
    <implementation_rules>
      - Reuse tokens from src/styles/tokens.css
      - Extend utilities if creating shared patterns
      - Keep style files under 150 lines
      - Co-locate component styles appropriately
      - No inline styles unless dynamic
    </implementation_rules>
    <outputs>
      - Code changes applied
      - Diff for review
    </outputs>
  </stage>

  <stage id="4" name="Review">
    <description>Validate improvements meet goals</description>
    <actions>
      - Visual check against improvement goals
      - Test responsive behavior
      - Verify no regressions
      - Check for consistency with related components
      - Confirm accessibility maintained
    </actions>
    <review_checklist>
      - [ ] Meets stated improvement goals
      - [ ] Consistent with existing design patterns
      - [ ] Responsive across breakpoints
      - [ ] No visual regressions
      - [ ] Accessibility maintained
      - [ ] Code follows project standards
    </review_checklist>
    <outputs>
      - Review summary
      - Ready for commit or needs iteration
    </outputs>
  </stage>
</stages>

<context_files>
  <required>
    - context/domain/ui-components.md
    - context/standards/visual-standards.md
  </required>
  <optional>
    - context/domain/styling-system.md
    - context/standards/code-quality.md
  </optional>
</context_files>

<agents_involved>
  <primary>web_developer — designs and implements improvements</primary>
  <support>device_tester — validates mobile improvements</support>
</agents_involved>

<example_flow>
  Input: "/improve sidebar"
  
  1. **Understand**: User wants sidebar to look better. Check current state—cramped spacing, inconsistent icons, no hover feedback.
  2. **Design**: Plan to add proper padding (--spacing-3), consistent icon sizes, subtle hover states matching other nav elements.
  3. **Implement**: Update sidebar.css with new spacing, add hover transitions, align with button component patterns.
  4. **Review**: Verify sidebar looks cleaner, test collapsed/expanded states, check mobile drawer variant.
</example_flow>
