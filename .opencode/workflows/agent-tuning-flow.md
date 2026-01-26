# Agent Tuning Workflow

<workflow>
  <name>agent-tuning-flow</name>
  <purpose>Fix agent behaviors, improve prompts, and tune orchestration</purpose>
  <trigger>/agent command, behavioral complaints, orchestration issues</trigger>
</workflow>

<stages>
  <stage id="1" name="Identify">
    <description>Understand the agent behavior problem</description>
    <actions>
      - Parse the complaint or improvement request
      - Identify which agent is affected
      - Categorize the issue type
      - Gather specific examples of problematic behavior
    </actions>
    <issue_types>
      - **Verbosity**: Too long/short responses
      - **Routing**: Wrong agent handles task
      - **Clarification**: Asks too many/few questions
      - **Context**: Missing knowledge or patterns
      - **Behavior**: Wrong approach to tasks
      - **Tone**: Inappropriate communication style
    </issue_types>
    <outputs>
      - Agent identified
      - Issue type classified
      - Specific examples noted
    </outputs>
  </stage>

  <stage id="2" name="Analyze">
    <description>Examine the agent's current configuration</description>
    <actions>
      - Read the agent's .md file
      - Find the section causing the issue
      - Understand why current behavior occurs
      - Identify what needs to change
    </actions>
    <agent_anatomy>
      - **Identity**: Name, role, personality
      - **Capabilities**: What it can do
      - **Routing logic**: How it decides what to do
      - **Behavior rules**: How it acts
      - **Response format**: Output style
      - **Context loading**: What knowledge it uses
    </agent_anatomy>
    <outputs>
      - Root cause in agent config
      - Specific section(s) to modify
    </outputs>
  </stage>

  <stage id="3" name="Fix">
    <description>Modify agent configuration</description>
    <actions>
      - Draft specific changes to agent file
      - Keep changes minimal and focused
      - Maintain XML structure
      - Preserve working behaviors
    </actions>
    <common_fixes>
      <verbosity>
        Add/modify response_style section with length guidance
        Example: `<brief>Keep responses under 3 paragraphs</brief>`
      </verbosity>
      <routing>
        Adjust triggers and conditions in routing_logic
        Add/remove keywords, clarify when to route where
      </routing>
      <clarification>
        Modify ask_when and dont_ask_when rules
        Be more specific about when questions are needed
      </clarification>
      <context>
        Add missing knowledge to project_knowledge section
        Include new patterns or conventions
      </context>
      <behavior>
        Update approach sections with better instructions
        Add examples of desired behavior
      </behavior>
    </common_fixes>
    <outputs>
      - Proposed changes (diff format)
      - Explanation of what will change
    </outputs>
  </stage>

  <stage id="4" name="Test">
    <description>Verify the fix works</description>
    <actions>
      - Apply the changes
      - Test with the original problematic prompt
      - Test with similar prompts
      - Verify no regressions in other behaviors
    </actions>
    <test_approach>
      1. Run the exact prompt that caused the issue
      2. Run 2-3 variations of similar prompts
      3. Run a prompt for a different use case (regression check)
      4. Compare new behavior to expectations
    </test_approach>
    <outputs>
      - Test results
      - Confirmation fix works or needs iteration
    </outputs>
  </stage>
</stages>

<context_files>
  <required>
    - context/processes/agent-tuning-flow.md (this file's context equivalent)
    - context/templates/agent-template.md
  </required>
</context_files>

<agents_involved>
  <primary>agent_fixer — analyzes and modifies agent files</primary>
  <coordinator>nomad — routes initial request, confirms changes</coordinator>
</agents_involved>

<agent_locations>
  <orchestrator>.opencode/agent/nomad.md</orchestrator>
  <specialists>
    - .opencode/agent/web_developer.md
    - .opencode/agent/subagents/device_tester.md
    - .opencode/agent/subagents/agent_fixer.md
    - .opencode/agent/subagents/debugger.md
  </specialists>
</agent_locations>

<example_flow>
  Input: "/agent web_developer is too verbose"
  
  1. **Identify**: web_developer agent, verbosity issue, responses are too long
  2. **Analyze**: Read web_developer.md, find response_style section lacks length constraints
  3. **Fix**: Add `<concise>Keep responses under 200 words. Show code, not explanations.</concise>` to response_style
  4. **Test**: Run "/fix sidebar padding" and verify response is shorter but still useful
</example_flow>

<rollback>
  If a change makes things worse:
  1. Git revert the agent file change
  2. Analyze why the fix failed
  3. Try a different approach
  
  Agent files are version controlled — easy to undo.
</rollback>
