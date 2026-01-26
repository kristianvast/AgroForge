---
description: Test on real mobile devices via Tailscale
agent: nomad
---

<command>
  <name>/test-mobile</name>
  <usage>/test-mobile [specific area]</usage>
  <examples>
    - /test-mobile
    - /test-mobile sidebar
    - /test-mobile after fixing header
    - /test-mobile new button component
  </examples>
</command>

<behavior>
  <mode>Interactive — guide through testing setup and capture feedback</mode>
  <approach>
    1. Check Tailscale connection status
    2. Provide device access URL
    3. Guide user through test scenarios
    4. Capture issues found
    5. Route fixes to appropriate agent
  </approach>
</behavior>

<routing>
  <primary agent="device_tester">
    Handles all mobile testing coordination
  </primary>
  
  <handoff agent="web_developer">
    When issues are found, hand off fixes to web_developer
  </handoff>
</routing>

<testing_flow>
  <step_1>Verify Tailscale is connected</step_1>
  <step_2>Get machine IP and provide URL</step_2>
  <step_3>Suggest key areas to test based on recent changes</step_3>
  <step_4>Provide testing checklist</step_4>
  <step_5>Collect feedback and issues</step_5>
  <step_6>Route fixes or confirm all good</step_6>
</testing_flow>

<context_to_load>
  - context/processes/mobile-testing-flow.md
  - context/standards/mobile-compatibility.md
  - context/domain/mobile-patterns.md
</context_to_load>

<response_format>
  Interactive and helpful:
  - Connection status
  - Access URL for device
  - Testing checklist
  - "What did you find?" prompt
</response_format>
