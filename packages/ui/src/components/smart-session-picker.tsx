import { Component, createSignal, createMemo, createEffect, For, Show, onCleanup } from "solid-js"
import { Dialog } from "@kobalte/core/dialog"
import type { Session, Agent, Provider, Model } from "../types/session"
import { getParentSessions, createSession, setActiveParentSession } from "../stores/sessions"
import { instances, stopInstance } from "../stores/instances"
import { agents, providers } from "../stores/sessions"
import { getSessionStatus } from "../stores/session-status"
import { recordAgentUsage, recordModelUsage, getAgentUsageScore, getModelUsageScore } from "../stores/preferences"
import { 
  MessageSquare, Search, X, Clock, Plus, Zap, Bot, Cpu, 
  ChevronRight, Sparkles, Star, Crown, History, ArrowRight
} from "lucide-solid"
import { getLogger } from "../lib/logger"
const log = getLogger("session")

// Model tier classification
function getModelTier(model: Model): "flagship" | "standard" | "efficient" {
  const name = model.name.toLowerCase()
  const id = model.id.toLowerCase()
  
  if (name.includes("opus") || name.includes("gpt-4o") || name.includes("claude-3.5") || 
      id.includes("opus") || name.includes("gemini-2")) {
    return "flagship"
  }
  if (name.includes("mini") || name.includes("flash") || name.includes("haiku") || 
      name.includes("nano") || name.includes("instant")) {
    return "efficient"
  }
  return "standard"
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

function getProviderIcon(providerId: string): string {
  const icons: Record<string, string> = {
    anthropic: "🔮",
    openai: "⚡",
    google: "🌐",
    mistral: "🌪️",
    groq: "⚡",
  }
  return icons[providerId.toLowerCase()] || "🤖"
}

interface SmartSessionPickerProps {
  instanceId: string
  open: boolean
  onClose: () => void
}

type PickerView = "main" | "agent-select" | "model-select"

const SmartSessionPicker: Component<SmartSessionPickerProps> = (props) => {
  const [view, setView] = createSignal<PickerView>("main")
  const [selectedAgent, setSelectedAgent] = createSignal<Agent | null>(null)
  const [selectedModel, setSelectedModel] = createSignal<{ model: Model; provider: Provider } | null>(null)
  const [searchQuery, setSearchQuery] = createSignal("")
  const [isCreating, setIsCreating] = createSignal(false)
  const [sessionSearchQuery, setSessionSearchQuery] = createSignal("")

  let searchInputRef: HTMLInputElement | undefined
  let sessionSearchRef: HTMLInputElement | undefined

  const instance = () => instances().get(props.instanceId)
  const parentSessions = () => getParentSessions(props.instanceId)
  const agentList = () => agents().get(props.instanceId) || []
  const providerList = () => providers().get(props.instanceId) || []

  // Get default agent (first non-subagent)
  const defaultAgent = createMemo(() => {
    const list = agentList()
    return list.find(a => a.mode !== "subagent") || list[0] || null
  })

  // Get default model (first available or from agent)
  const defaultModel = createMemo(() => {
    const agent = selectedAgent() || defaultAgent()
    if (agent?.model) {
      for (const provider of providerList()) {
        const model = provider.models.find(
          m => m.providerId === agent.model!.providerId && m.id === agent.model!.modelId
        )
        if (model) return { model, provider }
      }
    }
    // Fall back to first available model
    const firstProvider = providerList()[0]
    const firstModel = firstProvider?.models[0]
    return firstModel ? { model: firstModel, provider: firstProvider } : null
  })

  // Filter sessions
  const filteredSessions = createMemo(() => {
    const query = sessionSearchQuery().toLowerCase().trim()
    if (!query) return parentSessions()
    return parentSessions().filter(session => {
      const title = (session.title || "Untitled").toLowerCase()
      return title.includes(query)
    })
  })

  // Filter and sort agents by usage
  const filteredAgents = createMemo(() => {
    const query = searchQuery().toLowerCase().trim()
    let list = agentList().filter(a => a.mode !== "subagent")
    
    if (query) {
      list = list.filter(
        a => a.name.toLowerCase().includes(query) || 
             a.description?.toLowerCase().includes(query)
      )
    }
    
    // Sort by usage score
    return [...list].sort((a, b) => {
      const scoreA = getAgentUsageScore(a.name)
      const scoreB = getAgentUsageScore(b.name)
      return scoreB - scoreA
    })
  })

  // Group, filter, and sort models by usage
  const groupedModels = createMemo(() => {
    const query = searchQuery().toLowerCase().trim()
    return providerList()
      .map(provider => {
        let models = provider.models.filter(m => 
          !query || 
          m.name.toLowerCase().includes(query) ||
          m.id.toLowerCase().includes(query) ||
          provider.name.toLowerCase().includes(query)
        )
        
        // Sort models by usage within each provider
        models = [...models].sort((a, b) => {
          const scoreA = getModelUsageScore(a.providerId, a.id)
          const scoreB = getModelUsageScore(b.providerId, b.id)
          return scoreB - scoreA
        })
        
        return { ...provider, models }
      })
      .filter(p => p.models.length > 0)
      // Sort providers by their top model's usage
      .sort((a, b) => {
        const topA = a.models[0] ? getModelUsageScore(a.models[0].providerId, a.models[0].id) : 0
        const topB = b.models[0] ? getModelUsageScore(b.models[0].providerId, b.models[0].id) : 0
        return topB - topA
      })
  })

  // Smart recommendations based on usage
  const recommendedAgents = createMemo(() => {
    const list = agentList().filter(a => a.mode !== "subagent")
    // Sort by usage and return top 3
    return [...list]
      .sort((a, b) => getAgentUsageScore(b.name) - getAgentUsageScore(a.name))
      .slice(0, 3)
  })

  const recommendedModels = createMemo(() => {
    const models: { model: Model; provider: Provider; score: number }[] = []
    for (const provider of providerList()) {
      for (const model of provider.models) {
        const score = getModelUsageScore(model.providerId, model.id)
        models.push({ model, provider, score })
      }
    }
    // Sort by usage score, then by tier (flagship first for ties)
    return models
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        // For zero-usage models, prefer flagship
        const tierA = getModelTier(a.model)
        const tierB = getModelTier(b.model)
        if (tierA === "flagship" && tierB !== "flagship") return -1
        if (tierB === "flagship" && tierA !== "flagship") return 1
        return 0
      })
      .slice(0, 4)
      .map(({ model, provider }) => ({ model, provider }))
  })

  // Status helpers
  function getStatusInfo(session: Session) {
    const status = getSessionStatus(props.instanceId, session.id)
    const needsPermission = Boolean(session.pendingPermission)
    const needsQuestion = Boolean((session as any)?.pendingQuestion)
    const needsInput = needsPermission || needsQuestion
    
    return {
      status,
      needsInput,
      statusClass: needsInput ? "permission" : status,
      statusText: needsPermission ? "Permission" : needsQuestion ? "Input" : 
                  status === "working" ? "Working" : 
                  status === "compacting" ? "Compacting" : "Idle"
    }
  }

  function formatRelativeTime(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return "just now"
  }

  // Actions
  async function handleSessionSelect(sessionId: string) {
    setActiveParentSession(props.instanceId, sessionId)
    props.onClose()
  }

  async function handleCreateSession() {
    const agent = selectedAgent() || defaultAgent()
    if (!agent) return

    setIsCreating(true)
    try {
      const session = await createSession(props.instanceId, agent.name)
      // Record agent usage
      recordAgentUsage(agent.name)
      // Record model usage if one is selected
      const model = selectedModel() || defaultModel()
      if (model) {
        recordModelUsage(model.model.providerId, model.model.id)
      }
      setActiveParentSession(props.instanceId, session.id)
      props.onClose()
    } catch (error) {
      log.error("Failed to create session:", error)
    } finally {
      setIsCreating(false)
    }
  }

  async function handleQuickCreate(agent: Agent) {
    setIsCreating(true)
    try {
      const session = await createSession(props.instanceId, agent.name)
      // Record agent usage
      recordAgentUsage(agent.name)
      setActiveParentSession(props.instanceId, session.id)
      props.onClose()
    } catch (error) {
      log.error("Failed to create session:", error)
    } finally {
      setIsCreating(false)
    }
  }

  async function handleCancel() {
    await stopInstance(props.instanceId)
    props.onClose()
  }

  // Reset state on close
  createEffect(() => {
    if (!props.open) {
      setView("main")
      setSelectedAgent(null)
      setSelectedModel(null)
      setSearchQuery("")
      setSessionSearchQuery("")
    }
  })

  // Focus management
  createEffect(() => {
    if (props.open && view() === "main") {
      setTimeout(() => sessionSearchRef?.focus(), 100)
    } else if (props.open && (view() === "agent-select" || view() === "model-select")) {
      setTimeout(() => searchInputRef?.focus(), 100)
    }
  })

  // Keyboard shortcuts
  createEffect(() => {
    if (!props.open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (view() !== "main") {
          e.preventDefault()
          setView("main")
        }
      }
      if (e.key === "Enter" && e.metaKey) {
        e.preventDefault()
        handleCreateSession()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown))
  })

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && handleCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay class="picker-overlay" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content class="smart-picker-modal">
            
            {/* Main View */}
            <Show when={view() === "main"}>
              {/* Header */}
              <div class="smart-picker-header">
                <div class="smart-picker-header-content">
                  <div class="smart-picker-header-icon">
                    <Sparkles class="w-5 h-5" />
                  </div>
                  <div class="smart-picker-header-text">
                    <Dialog.Title class="smart-picker-title">
                      Start a Session
                    </Dialog.Title>
                    <span class="smart-picker-subtitle">
                      {instance()?.folder.split("/").pop()}
                    </span>
                  </div>
                </div>
                <button class="picker-close" onClick={handleCancel}>
                  <X class="w-4 h-4" />
                </button>
              </div>

              <div class="smart-picker-body">
                {/* Quick Create Section */}
                <div class="smart-picker-section">
                  <div class="smart-picker-section-header">
                    <h3 class="smart-picker-section-title">
                      <Plus class="w-4 h-4" />
                      Quick Start
                    </h3>
                  </div>
                  
                  {/* Agent + Model Selector Row */}
                  <div class="smart-picker-config">
                    <button 
                      class="smart-picker-config-item"
                      onClick={() => setView("agent-select")}
                    >
                      <div class="smart-picker-config-icon smart-picker-config-icon--agent">
                        <Bot class="w-4 h-4" />
                      </div>
                      <div class="smart-picker-config-content">
                        <span class="smart-picker-config-label">Agent</span>
                        <span class="smart-picker-config-value">
                          {selectedAgent()?.name || defaultAgent()?.name || "Select..."}
                        </span>
                      </div>
                      <ChevronRight class="w-4 h-4 text-muted" />
                    </button>

                    <button 
                      class="smart-picker-config-item"
                      onClick={() => setView("model-select")}
                    >
                      <div 
                        class="smart-picker-config-icon smart-picker-config-icon--model"
                        style={{ 
                          "--provider-accent": selectedModel()?.provider 
                            ? getProviderAccent(selectedModel()!.provider.id)
                            : defaultModel()?.provider 
                              ? getProviderAccent(defaultModel()!.provider.id)
                              : undefined
                        }}
                      >
                        <Cpu class="w-4 h-4" />
                      </div>
                      <div class="smart-picker-config-content">
                        <span class="smart-picker-config-label">Model</span>
                        <span class="smart-picker-config-value">
                          {selectedModel()?.model.name || defaultModel()?.model.name || "Select..."}
                        </span>
                      </div>
                      <ChevronRight class="w-4 h-4 text-muted" />
                    </button>
                  </div>

                  <button
                    class="smart-picker-create-btn"
                    onClick={handleCreateSession}
                    disabled={isCreating() || !defaultAgent()}
                  >
                    <Show when={!isCreating()} fallback={
                      <>
                        <div class="smart-picker-spinner" />
                        Creating...
                      </>
                    }>
                      <Sparkles class="w-4 h-4" />
                      Create New Session
                      <kbd class="smart-picker-kbd">⌘↵</kbd>
                    </Show>
                  </button>
                </div>

                {/* Divider */}
                <div class="smart-picker-divider">
                  <div class="smart-picker-divider-line" />
                  <span class="smart-picker-divider-text">or resume</span>
                  <div class="smart-picker-divider-line" />
                </div>

                {/* Resume Sessions Section */}
                <div class="smart-picker-section smart-picker-section--sessions">
                  <div class="smart-picker-section-header">
                    <h3 class="smart-picker-section-title">
                      <History class="w-4 h-4" />
                      Recent Sessions
                    </h3>
                    <Show when={parentSessions().length > 0}>
                      <span class="smart-picker-badge">{parentSessions().length}</span>
                    </Show>
                  </div>

                  {/* Search */}
                  <Show when={parentSessions().length > 3}>
                    <div class="smart-picker-search">
                      <Search class="smart-picker-search-icon" />
                      <input
                        ref={sessionSearchRef}
                        type="text"
                        class="smart-picker-search-input"
                        placeholder="Search sessions..."
                        value={sessionSearchQuery()}
                        onInput={(e) => setSessionSearchQuery(e.currentTarget.value)}
                      />
                      <Show when={sessionSearchQuery()}>
                        <button 
                          class="smart-picker-search-clear"
                          onClick={() => setSessionSearchQuery("")}
                        >
                          <X class="w-3.5 h-3.5" />
                        </button>
                      </Show>
                    </div>
                  </Show>

                  {/* Sessions List */}
                  <Show
                    when={parentSessions().length > 0}
                    fallback={
                      <div class="smart-picker-empty">
                        <MessageSquare class="w-8 h-8 opacity-40" />
                        <p>No previous sessions</p>
                        <span>Create your first session above</span>
                      </div>
                    }
                  >
                    <Show
                      when={filteredSessions().length > 0}
                      fallback={
                        <div class="smart-picker-empty smart-picker-empty--search">
                          <Search class="w-6 h-6 opacity-40" />
                          <p>No matching sessions</p>
                          <button onClick={() => setSessionSearchQuery("")}>
                            Clear search
                          </button>
                        </div>
                      }
                    >
                      <div class="smart-picker-sessions">
                        <For each={filteredSessions()}>
                          {(session) => {
                            const info = () => getStatusInfo(session)
                            return (
                              <button
                                class={`smart-picker-session ${info().needsInput ? "smart-picker-session--attention" : ""}`}
                                onClick={() => handleSessionSelect(session.id)}
                              >
                                <div class={`smart-picker-session-indicator smart-picker-session-indicator--${info().statusClass}`} />
                                
                                <div class="smart-picker-session-content">
                                  <span class="smart-picker-session-title">
                                    {session.title || "Untitled"}
                                  </span>
                                  <div class="smart-picker-session-meta">
                                    <span class={`smart-picker-session-status smart-picker-session-status--${info().statusClass}`}>
                                      <Show when={info().needsInput}>
                                        <Zap class="w-3 h-3" />
                                      </Show>
                                      <Show when={info().status === "working" && !info().needsInput}>
                                        <span class="smart-picker-pulse" />
                                      </Show>
                                      {info().statusText}
                                    </span>
                                    <span class="smart-picker-session-time">
                                      <Clock class="w-3 h-3" />
                                      {formatRelativeTime(session.time.updated)}
                                    </span>
                                  </div>
                                </div>

                                <ArrowRight class="w-4 h-4 smart-picker-session-arrow" />
                              </button>
                            )
                          }}
                        </For>
                      </div>
                    </Show>
                  </Show>
                </div>
              </div>

              {/* Footer */}
              <div class="smart-picker-footer">
                <button class="smart-picker-cancel" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </Show>

            {/* Agent Selection View */}
            <Show when={view() === "agent-select"}>
              <div class="smart-picker-header">
                <button class="smart-picker-back" onClick={() => setView("main")}>
                  <ChevronRight class="w-4 h-4 rotate-180" />
                </button>
                <div class="smart-picker-header-text">
                  <Dialog.Title class="smart-picker-title">Select Agent</Dialog.Title>
                </div>
                <button class="picker-close" onClick={handleCancel}>
                  <X class="w-4 h-4" />
                </button>
              </div>

              <div class="picker-search mx-4 mt-3">
                <Search class="picker-search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  class="picker-search-input"
                  placeholder="Search agents..."
                  value={searchQuery()}
                  onInput={(e) => setSearchQuery(e.currentTarget.value)}
                />
                <Show when={searchQuery()}>
                  <button class="picker-search-clear" onClick={() => setSearchQuery("")}>
                    <X class="w-3.5 h-3.5" />
                  </button>
                </Show>
              </div>

              <div class="picker-content">
                <div class="picker-agent-grid">
                  <For each={filteredAgents()} fallback={
                    <div class="picker-empty">
                      <Bot class="w-8 h-8 opacity-40" />
                      <p>No agents found</p>
                    </div>
                  }>
                    {(agent) => {
                      const isSelected = (selectedAgent() || defaultAgent())?.name === agent.name
                      return (
                        <button
                          class={`picker-agent-card ${isSelected ? "picker-agent-card--selected" : ""}`}
                          onClick={() => {
                            setSelectedAgent(agent)
                            setView("main")
                          }}
                        >
                          <div class="picker-agent-card-header">
                            <div class="picker-agent-avatar">
                              <Bot class="w-5 h-5" />
                            </div>
                            <Show when={isSelected}>
                              <div class="picker-agent-check">
                                <Zap class="w-3 h-3" />
                              </div>
                            </Show>
                          </div>
                          
                          <div class="picker-agent-card-body">
                            <h3 class="picker-agent-name">{agent.name}</h3>
                            <Show when={agent.description}>
                              <p class="picker-agent-description">
                                {agent.description.length > 80 
                                  ? agent.description.slice(0, 80) + "..." 
                                  : agent.description}
                              </p>
                            </Show>
                          </div>
                        </button>
                      )
                    }}
                  </For>
                </div>
              </div>
            </Show>

            {/* Model Selection View */}
            <Show when={view() === "model-select"}>
              <div class="smart-picker-header">
                <button class="smart-picker-back" onClick={() => setView("main")}>
                  <ChevronRight class="w-4 h-4 rotate-180" />
                </button>
                <div class="smart-picker-header-text">
                  <Dialog.Title class="smart-picker-title">Select Model</Dialog.Title>
                </div>
                <button class="picker-close" onClick={handleCancel}>
                  <X class="w-4 h-4" />
                </button>
              </div>

              <div class="picker-search mx-4 mt-3">
                <Search class="picker-search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  class="picker-search-input"
                  placeholder="Search models..."
                  value={searchQuery()}
                  onInput={(e) => setSearchQuery(e.currentTarget.value)}
                />
                <Show when={searchQuery()}>
                  <button class="picker-search-clear" onClick={() => setSearchQuery("")}>
                    <X class="w-3.5 h-3.5" />
                  </button>
                </Show>
              </div>

              <div class="picker-content">
                <div class="picker-model-list">
                  <For each={groupedModels()} fallback={
                    <div class="picker-empty">
                      <Cpu class="w-8 h-8 opacity-40" />
                      <p>No models found</p>
                    </div>
                  }>
                    {(provider) => (
                      <div class="picker-model-group">
                        <div 
                          class="picker-model-group-header"
                          style={{ "--provider-accent": getProviderAccent(provider.id) }}
                        >
                          <span class="picker-model-group-icon">{getProviderIcon(provider.id)}</span>
                          <span class="picker-model-group-name">{provider.name}</span>
                          <span class="picker-model-group-count">{provider.models.length}</span>
                        </div>
                        
                        <div class="picker-model-group-items">
                          <For each={provider.models}>
                            {(model) => {
                              const current = selectedModel() || defaultModel()
                              const isSelected = current?.model.providerId === model.providerId && 
                                                current?.model.id === model.id
                              const tier = getModelTier(model)
                              return (
                                <button
                                  class={`picker-model-item ${isSelected ? "picker-model-item--selected" : ""} picker-model-item--${tier}`}
                                  onClick={() => {
                                    setSelectedModel({ model, provider })
                                    setView("main")
                                  }}
                                  style={{ "--provider-accent": getProviderAccent(provider.id) }}
                                >
                                  <div class="picker-model-item-main">
                                    <div class="picker-model-item-icon">
                                      <Show when={tier === "flagship"} fallback={
                                        <Show when={tier === "efficient"} fallback={<Cpu class="w-4 h-4" />}>
                                          <Zap class="w-4 h-4" />
                                        </Show>
                                      }>
                                        <Crown class="w-4 h-4" />
                                      </Show>
                                    </div>
                                    <div class="picker-model-item-info">
                                      <span class="picker-model-item-name">{model.name}</span>
                                      <span class="picker-model-item-id">{model.id}</span>
                                    </div>
                                  </div>
                                  
                                  <div class="picker-model-item-meta">
                                    <Show when={tier === "flagship"}>
                                      <span class="picker-model-badge picker-model-badge--flagship">
                                        <Star class="w-3 h-3" /> Top
                                      </span>
                                    </Show>
                                    <Show when={tier === "efficient"}>
                                      <span class="picker-model-badge picker-model-badge--efficient">
                                        <Zap class="w-3 h-3" /> Fast
                                      </span>
                                    </Show>
                                  </div>
                                </button>
                              )
                            }}
                          </For>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  )
}

export default SmartSessionPicker
