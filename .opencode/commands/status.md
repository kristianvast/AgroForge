---
description: Get current state overview of CodeNomad project
agent: nomad
---

<command>
  <name>/status</name>
  <usage>/status [area]</usage>
  <examples>
    - /status
    - /status mobile
    - /status agents
    - /status recent changes
  </examples>
</command>

<behavior>
  <mode>Informational — gather and present current state</mode>
  <approach>
    1. Check git status for uncommitted changes
    2. Review recent commits
    3. Check for any build/lint issues
    4. Summarize current work context
    5. Note any pending tasks or known issues
  </approach>
</behavior>

<routing>
  <primary agent="nomad">
    Handles status checks directly (no delegation needed)
  </primary>
</routing>

<status_areas>
  <general>
    - Git status (branch, uncommitted changes)
    - Recent commits (last 5)
    - Any build errors or warnings
    - Active dev server status
  </general>
  
  <mobile>
    - Mobile-related recent changes
    - Known mobile issues
    - Tailscale connection status
    - Last mobile test results
  </mobile>
  
  <agents>
    - List available agents
    - Recent agent modifications
    - Agent health/configuration status
  </agents>
  
  <recent>
    - Files changed in last session
    - Commits since last tag
    - Open TODOs or FIXMEs
  </recent>
</status_areas>

<checks_to_run>
  <git>git status, git log --oneline -5</git>
  <build>Check for TypeScript errors if applicable</build>
  <dev_server>Check if dev server is running</dev_server>
</checks_to_run>

<response_format>
  Quick overview:
  
  ## CodeNomad Status
  
  **Branch**: {branch} ({clean/dirty})
  **Recent**: {last commit summary}
  
  **Changes**: {uncommitted file count or "all committed"}
  
  **Dev Server**: {running/not running}
  
  **Quick Actions**:
  - /fix {any obvious issues}
  - /test-mobile (if changes affect mobile)
</response_format>
