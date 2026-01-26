import { Component, createSignal, createMemo, Show } from "solid-js"
import { agents, providers } from "../stores/sessions"
import type { Agent, Model } from "../types/session"
import { Bot, Cpu, ChevronDown, Sparkles } from "lucide-solid"
import AgentModelPicker from "./agent-model-picker"

interface AgentModelTriggerProps {
  instanceId: string
  sessionId: string
  currentAgent: string
  currentModel: { providerId: string; modelId: string }
  onAgentChange: (agent: string) => Promise<void>
  onModelChange: (model: { providerId: string; modelId: string }) => Promise<void>
}

// Provider color mapping
function getProviderAccent(providerId: string): string {
  const colors: Record<string, string> = {
    anthropic: "var(--accent-anthropic, #d97757)",
    openai: "var(--accent-openai, #10a37f)",
    google: "var(--accent-google, #4285f4)",
    mistral: "var(--accent-mistral, #ff7000)",
    groq: "var(--accent-groq, #f55036)",
  }
  return colors[providerId.toLowerCase()] || "var(--accent-primary)"
}

const AgentModelTrigger: Component<AgentModelTriggerProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [initialMode, setInitialMode] = createSignal<"agent" | "model">("agent")

  const instanceAgents = () => agents().get(props.instanceId) || []
  const instanceProviders = () => providers().get(props.instanceId) || []

  const currentAgentData = createMemo(() => 
    instanceAgents().find(a => a.name === props.currentAgent)
  )

  const currentModelData = createMemo(() => {
    for (const provider of instanceProviders()) {
      const model = provider.models.find(
        m => m.providerId === props.currentModel.providerId && m.id === props.currentModel.modelId
      )
      if (model) return { model, provider }
    }
    return null
  })

  function openWithMode(mode: "agent" | "model") {
    setInitialMode(mode)
    setIsOpen(true)
  }

  return (
    <>
      <div class="agent-model-trigger">
        {/* Agent Button */}
        <button 
          class="agent-model-trigger-btn agent-model-trigger-btn--agent"
          onClick={() => openWithMode("agent")}
          title="Change agent"
        >
          <div class="agent-model-trigger-icon agent-model-trigger-icon--agent">
            <Bot class="w-3.5 h-3.5" />
          </div>
          <div class="agent-model-trigger-content">
            <span class="agent-model-trigger-label">Agent</span>
            <span class="agent-model-trigger-value">{currentAgentData()?.name || "None"}</span>
          </div>
          <ChevronDown class="agent-model-trigger-chevron" />
        </button>

        {/* Model Button */}
        <button 
          class="agent-model-trigger-btn agent-model-trigger-btn--model"
          onClick={() => openWithMode("model")}
          title="Change model"
          style={{ "--provider-accent": currentModelData() ? getProviderAccent(currentModelData()!.provider.id) : undefined }}
        >
          <div class="agent-model-trigger-icon agent-model-trigger-icon--model">
            <Cpu class="w-3.5 h-3.5" />
          </div>
          <div class="agent-model-trigger-content">
            <span class="agent-model-trigger-label">Model</span>
            <span class="agent-model-trigger-value">{currentModelData()?.model.name || "None"}</span>
          </div>
          <ChevronDown class="agent-model-trigger-chevron" />
        </button>
      </div>

      <AgentModelPicker
        instanceId={props.instanceId}
        sessionId={props.sessionId}
        currentAgent={props.currentAgent}
        currentModel={props.currentModel}
        onAgentChange={props.onAgentChange}
        onModelChange={props.onModelChange}
        mode={initialMode()}
        open={isOpen()}
        onOpenChange={setIsOpen}
      />
    </>
  )
}

export default AgentModelTrigger
