# Mobile Fix Workflow

<workflow>
  <name>mobile-fix-flow</name>
  <purpose>Detect, analyze, fix, and validate mobile UI issues</purpose>
  <trigger>Mobile-related bug reports, responsive issues, touch problems</trigger>
</workflow>

<stages>
  <stage id="1" name="Detect">
    <description>Identify and understand the mobile issue</description>
    <actions>
      - Parse issue description for symptoms
      - Identify affected device(s) and screen size(s)
      - Determine if visual, functional, or performance issue
      - Locate relevant component(s) in codebase
    </actions>
    <outputs>
      - Issue type classification
      - Affected files list
      - Device/breakpoint context
    </outputs>
  </stage>

  <stage id="2" name="Analyze">
    <description>Root cause analysis</description>
    <actions>
      - Review component CSS for responsive rules
      - Check breakpoint definitions in tokens.css
      - Verify touch target sizes (min 44px)
      - Look for desktop-only patterns that break mobile
      - Check for viewport/overflow issues
    </actions>
    <common_causes>
      - Missing or incorrect media queries
      - Fixed widths that don't adapt
      - Hover-only interactions with no touch fallback
      - Text/elements overflowing containers
      - Z-index stacking issues on smaller screens
    </common_causes>
    <outputs>
      - Root cause identified
      - Fix approach determined
    </outputs>
  </stage>

  <stage id="3" name="Fix">
    <description>Apply the fix using mobile-first patterns</description>
    <actions>
      - Apply mobile-first CSS (base styles for mobile, enhance for desktop)
      - Use project breakpoints from tokens.css
      - Ensure touch targets meet 44px minimum
      - Test overflow and scrolling behavior
      - Verify text remains readable
    </actions>
    <patterns>
      - Use `min-width` media queries (mobile-first)
      - Prefer flexbox/grid over fixed positioning
      - Use relative units (rem, %) over fixed pixels
      - Add touch-action CSS where needed
    </patterns>
    <outputs>
      - Code changes applied
      - Diff available for review
    </outputs>
  </stage>

  <stage id="4" name="Validate">
    <description>Verify fix works across devices</description>
    <actions>
      - Test in browser dev tools responsive mode
      - Check all relevant breakpoints (320px, 375px, 768px, 1024px)
      - Test on real device via Tailscale if available
      - Verify fix doesn't break desktop
      - Check for any regressions in related components
    </actions>
    <validation_checklist>
      - [ ] Works on small phone (320px)
      - [ ] Works on standard phone (375px)
      - [ ] Works on large phone (428px)
      - [ ] Works on tablet (768px)
      - [ ] Desktop not broken (1024px+)
      - [ ] Touch targets adequate
      - [ ] Text readable
      - [ ] No overflow/scroll issues
    </validation_checklist>
    <outputs>
      - Validation report
      - Ready for commit or needs iteration
    </outputs>
  </stage>
</stages>

<context_files>
  <required>
    - context/domain/mobile-patterns.md
    - context/standards/mobile-compatibility.md
  </required>
  <optional>
    - context/domain/styling-system.md
    - context/processes/mobile-testing-flow.md
  </optional>
</context_files>

<agents_involved>
  <primary>web_developer — applies the fix</primary>
  <support>device_tester — validates on real devices</support>
  <support>debugger — if root cause is unclear</support>
</agents_involved>

<example_flow>
  Input: "fix mobile menu"
  
  1. **Detect**: Menu component, hamburger behavior, mobile breakpoint issue
  2. **Analyze**: Menu uses fixed width 280px, doesn't collapse properly below 375px
  3. **Fix**: Change to max-width: 90vw, add proper transform animation
  4. **Validate**: Test 320px-1024px range, confirm menu works and desktop unaffected
</example_flow>
