import { Component, createSignal, createMemo, For, Show, createEffect, onCleanup } from "solid-js"
import { Dialog } from "@kobalte/core/dialog"
import { agents, providers } from "../stores/sessions"
import { recordAgentUsage, recordModelUsage, getAgentUsageScore, getModelUsageScore, preferences } from "../stores/preferences"
import type { Agent, Provider, Model } from "../types/session"
import { Bot, Cpu, Search, X, Sparkles, Zap, Check, ChevronRight, Star, Crown, Layers, Clock, TrendingUp } from "lucide-solid"

type PickerMode = "agent" | "model"

interface AgentModelPickerProps {
  instanceId: string
  sessionId: string
  currentAgent: string
  currentModel: { providerId: string; modelId: string }
  onAgentChange: (agent: string) => Promise<void>
  onModelChange: (model: { providerId: string; modelId: string }) => Promise<void>
  mode?: PickerMode
  onModeChange?: (mode: PickerMode) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Model tier classification for visual treatment
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

// Provider color mapping for visual distinction
function getProviderAccent(providerId: string): string {
  const colors: Record<string, string> = {
    anthropic: "var(--accent-anthropic, #d97757)",
    openai: "var(--accent-openai, #10a37f)",
    google: "var(--accent-google, #4285f4)",
    mistral: "var(--accent-mistral, #ff7000)",
    groq: "var(--accent-groq, #f55036)",
    xai: "var(--accent-xai, #1d9bf0)",
    aws: "var(--accent-aws, #ff9900)",
    azure: "var(--accent-azure, #0078d4)",
  }
  return colors[providerId.toLowerCase()] || "var(--accent-primary)"
}

// Provider icon based on ID
function getProviderIcon(providerId: string): string {
  const icons: Record<string, string> = {
    anthropic: "🔮",
    openai: "⚡",
    google: "🌐",
    mistral: "🌪️",
    groq: "⚡",
    xai: "𝕏",
    aws: "☁️",
    azure: "☁️",
  }
  return icons[providerId.toLowerCase()] || "🤖"
}

const AgentModelPicker: Component<AgentModelPickerProps> = (props) => {
  const [activeTab, setActiveTab] = createSignal<PickerMode>(props.mode || "agent")
  const [searchQuery, setSearchQuery] = createSignal("")
  const [selectedProvider, setSelectedProvider] = createSignal<string | null>(null)
  const [isChanging, setIsChanging] = createSignal(false)
  let searchInputRef: HTMLInputElement | undefined

  const instanceAgents = () => agents().get(props.instanceId) || []
  const instanceProviders = () => providers().get(props.instanceId) || []

  // Get recently used agents (based on usage tracking with recency)
  const recentlyUsedAgents = createMemo(() => {
    const agentUsage = preferences().agentUsage || []
    const all = instanceAgents()
    const mainAgents = all.filter(a => a.mode !== "subagent")
    
    // Get agents that have been used, sorted by most recent
    return agentUsage
      .filter(usage => usage.lastUsed > 0)
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, 4)
      .map(usage => mainAgents.find(a => a.name === usage.name))
      .filter((a): a is Agent => !!a)
  })

  // Get recommended agents (flagship or frequently used, excluding recents)
  const recommendedAgents = createMemo(() => {
    const all = instanceAgents()
    const mainAgents = all.filter(a => a.mode !== "subagent")
    const recentNames = new Set(recentlyUsedAgents().map(a => a.name))
    
    // Sort by usage score, filter out recent ones
    return [...mainAgents]
      .filter(a => !recentNames.has(a.name))
      .sort((a, b) => getAgentUsageScore(b.name) - getAgentUsageScore(a.name))
      .slice(0, 3)
  })

  // Filter and sort agents based on search and usage
  const filteredAgents = createMemo(() => {
    const query = searchQuery().toLowerCase().trim()
    const all = instanceAgents()
    
    // Filter out subagents for main selection unless explicitly searched
    let mainAgents = all.filter(a => a.mode !== "subagent")
    
    if (query) {
      mainAgents = mainAgents.filter(
        a => a.name.toLowerCase().includes(query) || 
             a.description?.toLowerCase().includes(query)
      )
    }
    
    // Sort by usage score (most used first)
    return [...mainAgents].sort((a, b) => {
      const scoreA = getAgentUsageScore(a.name)
      const scoreB = getAgentUsageScore(b.name)
      return scoreB - scoreA
    })
  })

  // Get recently used models (based on usage tracking with recency)
  const recentlyUsedModels = createMemo(() => {
    const modelUsage = preferences().modelUsage || []
    const allProviders = instanceProviders()
    
    // Get models that have been used, sorted by most recent
    return modelUsage
      .filter(usage => usage.lastUsed > 0)
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, 4)
      .map(usage => {
        for (const provider of allProviders) {
          const model = provider.models.find(
            m => m.providerId === usage.providerId && m.id === usage.modelId
          )
          if (model) return { model, provider }
        }
        return null
      })
      .filter((m): m is { model: Model; provider: Provider } => !!m)
  })

  // Get recommended models (best model from each provider)
  const recommendedModels = createMemo(() => {
    const allProviders = instanceProviders()
    const recentKeys = new Set(
      recentlyUsedModels().map(m => `${m.model.providerId}:${m.model.id}`)
    )
    
    // Get best model from each provider (flagship > standard > efficient, then by usage)
    const bestPerProvider: { model: Model; provider: Provider; tier: string; score: number }[] = []
    
    for (const provider of allProviders) {
      // Score all models for this provider
      const providerModels = provider.models
        .filter(m => !recentKeys.has(`${m.providerId}:${m.id}`))
        .map(model => ({
          model,
          provider,
          tier: getModelTier(model),
          score: getModelUsageScore(model.providerId, model.id)
        }))
        .sort((a, b) => {
          // Flagship > standard > efficient
          const tierOrder = { flagship: 0, standard: 1, efficient: 2 }
          const tierDiff = tierOrder[a.tier as keyof typeof tierOrder] - tierOrder[b.tier as keyof typeof tierOrder]
          if (tierDiff !== 0) return tierDiff
          // Then by usage score
          return b.score - a.score
        })
      
      // Take the best one from this provider
      if (providerModels.length > 0) {
        bestPerProvider.push(providerModels[0])
      }
    }
    
    // Sort providers by their best model's tier and score
    return bestPerProvider.sort((a, b) => {
      const tierOrder = { flagship: 0, standard: 1, efficient: 2 }
      const tierDiff = tierOrder[a.tier as keyof typeof tierOrder] - tierOrder[b.tier as keyof typeof tierOrder]
      if (tierDiff !== 0) return tierDiff
      return b.score - a.score
    })
  })

  // Group models by provider, filter, and sort by usage
  const groupedModels = createMemo(() => {
    const query = searchQuery().toLowerCase().trim()
    const providerFilter = selectedProvider()
    
    return instanceProviders()
      .filter(p => !providerFilter || p.id === providerFilter)
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

  // Current selections for display
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

  // Handle agent selection
  async function handleAgentSelect(agent: Agent) {
    if (agent.name === props.currentAgent) return
    setIsChanging(true)
    try {
      await props.onAgentChange(agent.name)
      // Record usage for sorting
      recordAgentUsage(agent.name)
      // Auto-switch to model picker after agent selection
      setTimeout(() => setActiveTab("model"), 300)
    } finally {
      setIsChanging(false)
    }
  }

  // Handle model selection
  async function handleModelSelect(model: Model) {
    if (model.providerId === props.currentModel.providerId && model.id === props.currentModel.modelId) {
      props.onOpenChange(false)
      return
    }
    setIsChanging(true)
    try {
      await props.onModelChange({ providerId: model.providerId, modelId: model.id })
      // Record usage for sorting
      recordModelUsage(model.providerId, model.id)
      props.onOpenChange(false)
    } finally {
      setIsChanging(false)
    }
  }

  // Reset state when dialog opens
  createEffect(() => {
    if (props.open) {
      setSearchQuery("")
      setSelectedProvider(null)
      setActiveTab(props.mode || "agent")
      // Focus search after animation
      setTimeout(() => searchInputRef?.focus(), 100)
    }
  })

  // Keyboard navigation
  createEffect(() => {
    if (!props.open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault()
        setActiveTab(prev => prev === "agent" ? "model" : "agent")
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown))
  })

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="picker-overlay" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content class="picker-modal">
            {/* Compact Header with Current Selection */}
            <div class="picker-header">
              <div class="picker-current-selection">
                <div class="picker-current-item" onClick={() => setActiveTab("agent")}>
                  <div class="picker-current-icon picker-current-icon--agent">
                    <Bot class="w-4 h-4" />
                  </div>
                  <div class="picker-current-info">
                    <span class="picker-current-label">Agent</span>
                    <span class="picker-current-value">{currentAgentData()?.name || "None"}</span>
                  </div>
                </div>
                
                <ChevronRight class="picker-current-separator" />
                
                <div class="picker-current-item" onClick={() => setActiveTab("model")}>
                  <div 
                    class="picker-current-icon picker-current-icon--model"
                    style={{ "--provider-accent": currentModelData() ? getProviderAccent(currentModelData()!.provider.id) : undefined }}
                  >
                    <Cpu class="w-4 h-4" />
                  </div>
                  <div class="picker-current-info">
                    <span class="picker-current-label">Model</span>
                    <span class="picker-current-value">{currentModelData()?.model.name || "None"}</span>
                  </div>
                </div>
              </div>
              
              <button class="picker-close" onClick={() => props.onOpenChange(false)}>
                <X class="w-4 h-4" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div class="picker-tabs">
              <button 
                class={`picker-tab ${activeTab() === "agent" ? "picker-tab--active" : ""}`}
                onClick={() => setActiveTab("agent")}
              >
                <Bot class="w-4 h-4" />
                <span>Agents</span>
                <Show when={filteredAgents().length > 0}>
                  <span class="picker-tab-count">{filteredAgents().length}</span>
                </Show>
              </button>
              <button 
                class={`picker-tab ${activeTab() === "model" ? "picker-tab--active" : ""}`}
                onClick={() => setActiveTab("model")}
              >
                <Cpu class="w-4 h-4" />
                <span>Models</span>
              </button>
              <div 
                class="picker-tab-indicator" 
                style={{ transform: `translateX(${activeTab() === "agent" ? "0" : "100"}%)` }}
              />
            </div>

            {/* Search Bar */}
            <div class="picker-search">
              <Search class="picker-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                class="picker-search-input"
                placeholder={activeTab() === "agent" ? "Search agents..." : "Search models or providers..."}
                value={searchQuery()}
                onInput={(e) => setSearchQuery(e.currentTarget.value)}
              />
              <Show when={searchQuery()}>
                <button class="picker-search-clear" onClick={() => setSearchQuery("")}>
                  <X class="w-3.5 h-3.5" />
                </button>
              </Show>
              <kbd class="picker-search-hint">Tab</kbd>
            </div>

            {/* Content Area */}
            <div class="picker-content">
              {/* Agent Grid */}
              <Show when={activeTab() === "agent"}>
                <Show when={!searchQuery()} fallback={
                  /* Search results - flat list */
                  <div class="picker-agent-grid">
                    <For each={filteredAgents()} fallback={
                      <div class="picker-empty">
                        <Bot class="w-8 h-8 opacity-40" />
                        <p>No agents found</p>
                      </div>
                    }>
                      {(agent) => {
                        const isSelected = agent.name === props.currentAgent
                        const hasDefaultModel = !!agent.model
                        return (
                          <button
                            class={`picker-agent-card ${isSelected ? "picker-agent-card--selected" : ""}`}
                            onClick={() => handleAgentSelect(agent)}
                            disabled={isChanging()}
                          >
                            <div class="picker-agent-card-header">
                              <div class="picker-agent-avatar">
                                <Bot class="w-5 h-5" />
                              </div>
                              <Show when={isSelected}>
                                <div class="picker-agent-check">
                                  <Check class="w-3 h-3" />
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

                            <div class="picker-agent-card-footer">
                              <Show when={hasDefaultModel}>
                                <span class="picker-agent-badge picker-agent-badge--model">
                                  <Cpu class="w-3 h-3" />
                                  Has default model
                                </span>
                              </Show>
                            </div>
                          </button>
                        )
                      }}
                    </For>
                  </div>
                }>
                  {/* Sectioned view when not searching */}
                  <div class="picker-sections">
                    {/* Recently Used Section */}
                    <Show when={recentlyUsedAgents().length > 0}>
                      <div class="picker-section">
                        <div class="picker-section-header">
                          <Clock class="w-4 h-4" />
                          <span>Recently Used</span>
                        </div>
                        <div class="picker-agent-grid picker-agent-grid--compact">
                          <For each={recentlyUsedAgents()}>
                            {(agent) => {
                              const isSelected = agent.name === props.currentAgent
                              return (
                                <button
                                  class={`picker-agent-card picker-agent-card--compact ${isSelected ? "picker-agent-card--selected" : ""}`}
                                  onClick={() => handleAgentSelect(agent)}
                                  disabled={isChanging()}
                                >
                                  <div class="picker-agent-avatar picker-agent-avatar--small">
                                    <Bot class="w-4 h-4" />
                                  </div>
                                  <span class="picker-agent-name">{agent.name}</span>
                                  <Show when={isSelected}>
                                    <Check class="w-3.5 h-3.5 picker-agent-inline-check" />
                                  </Show>
                                </button>
                              )
                            }}
                          </For>
                        </div>
                      </div>
                    </Show>

                    {/* Recommended Section */}
                    <Show when={recommendedAgents().length > 0}>
                      <div class="picker-section">
                        <div class="picker-section-header">
                          <TrendingUp class="w-4 h-4" />
                          <span>Recommended</span>
                        </div>
                        <div class="picker-agent-grid">
                          <For each={recommendedAgents()}>
                            {(agent) => {
                              const isSelected = agent.name === props.currentAgent
                              const hasDefaultModel = !!agent.model
                              return (
                                <button
                                  class={`picker-agent-card ${isSelected ? "picker-agent-card--selected" : ""}`}
                                  onClick={() => handleAgentSelect(agent)}
                                  disabled={isChanging()}
                                >
                                  <div class="picker-agent-card-header">
                                    <div class="picker-agent-avatar">
                                      <Bot class="w-5 h-5" />
                                    </div>
                                    <Show when={isSelected}>
                                      <div class="picker-agent-check">
                                        <Check class="w-3 h-3" />
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

                                  <div class="picker-agent-card-footer">
                                    <Show when={hasDefaultModel}>
                                      <span class="picker-agent-badge picker-agent-badge--model">
                                        <Cpu class="w-3 h-3" />
                                        Has default model
                                      </span>
                                    </Show>
                                  </div>
                                </button>
                              )
                            }}
                          </For>
                        </div>
                      </div>
                    </Show>

                    {/* All Agents Section */}
                    <div class="picker-section">
                      <div class="picker-section-header">
                        <Layers class="w-4 h-4" />
                        <span>All Agents</span>
                        <span class="picker-section-count">{filteredAgents().length}</span>
                      </div>
                      <div class="picker-agent-grid">
                        <For each={filteredAgents()} fallback={
                          <div class="picker-empty">
                            <Bot class="w-8 h-8 opacity-40" />
                            <p>No agents found</p>
                          </div>
                        }>
                          {(agent) => {
                            const isSelected = agent.name === props.currentAgent
                            const hasDefaultModel = !!agent.model
                            return (
                              <button
                                class={`picker-agent-card ${isSelected ? "picker-agent-card--selected" : ""}`}
                                onClick={() => handleAgentSelect(agent)}
                                disabled={isChanging()}
                              >
                                <div class="picker-agent-card-header">
                                  <div class="picker-agent-avatar">
                                    <Bot class="w-5 h-5" />
                                  </div>
                                  <Show when={isSelected}>
                                    <div class="picker-agent-check">
                                      <Check class="w-3 h-3" />
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

                                <div class="picker-agent-card-footer">
                                  <Show when={hasDefaultModel}>
                                    <span class="picker-agent-badge picker-agent-badge--model">
                                      <Cpu class="w-3 h-3" />
                                      Has default model
                                    </span>
                                  </Show>
                                </div>
                              </button>
                            )
                          }}
                        </For>
                      </div>
                    </div>
                  </div>
                </Show>
              </Show>

              {/* Model Selection */}
              <Show when={activeTab() === "model"}>
                <Show when={!searchQuery() && !selectedProvider()} fallback={
                  /* Searching or filtering - show grouped view */
                  <>
                    {/* Provider Filter Pills */}
                    <div class="picker-provider-pills">
                      <button 
                        class={`picker-provider-pill ${!selectedProvider() ? "picker-provider-pill--active" : ""}`}
                        onClick={() => setSelectedProvider(null)}
                      >
                        <Layers class="w-3.5 h-3.5" />
                        All
                      </button>
                      <For each={instanceProviders()}>
                        {(provider) => (
                          <button 
                            class={`picker-provider-pill ${selectedProvider() === provider.id ? "picker-provider-pill--active" : ""}`}
                            onClick={() => setSelectedProvider(prev => prev === provider.id ? null : provider.id)}
                            style={{ "--provider-accent": getProviderAccent(provider.id) }}
                          >
                            <span class="picker-provider-emoji">{getProviderIcon(provider.id)}</span>
                            {provider.name}
                            <span class="picker-provider-count">{provider.models.length}</span>
                          </button>
                        )}
                      </For>
                    </div>

                    {/* Model List by Provider */}
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
                                  const isSelected = model.providerId === props.currentModel.providerId && 
                                                    model.id === props.currentModel.modelId
                                  const tier = getModelTier(model)
                                  return (
                                    <button
                                      class={`picker-model-item ${isSelected ? "picker-model-item--selected" : ""} picker-model-item--${tier}`}
                                      onClick={() => handleModelSelect(model)}
                                      disabled={isChanging()}
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
                                        <Show when={isSelected}>
                                          <div class="picker-model-check">
                                            <Check class="w-3.5 h-3.5" />
                                          </div>
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
                  </>
                }>
                  {/* Sectioned view - Recently Used, Recommended, then Providers */}
                  <div class="picker-sections">
                    {/* Recently Used Models */}
                    <Show when={recentlyUsedModels().length > 0}>
                      <div class="picker-section">
                        <div class="picker-section-header">
                          <Clock class="w-4 h-4" />
                          <span>Recently Used</span>
                        </div>
                        <div class="picker-model-grid">
                          <For each={recentlyUsedModels()}>
                            {({ model, provider }) => {
                              const isSelected = model.providerId === props.currentModel.providerId && 
                                                model.id === props.currentModel.modelId
                              const tier = getModelTier(model)
                              return (
                                <button
                                  class={`picker-model-card ${isSelected ? "picker-model-card--selected" : ""} picker-model-card--${tier}`}
                                  onClick={() => handleModelSelect(model)}
                                  disabled={isChanging()}
                                  style={{ "--provider-accent": getProviderAccent(provider.id) }}
                                >
                                  <div class="picker-model-card-header">
                                    <span class="picker-model-card-provider">{getProviderIcon(provider.id)}</span>
                                    <Show when={isSelected}>
                                      <Check class="w-3.5 h-3.5 picker-model-inline-check" />
                                    </Show>
                                  </div>
                                  <span class="picker-model-card-name">{model.name}</span>
                                  <Show when={tier !== "standard"}>
                                    <span class={`picker-model-card-tier picker-model-card-tier--${tier}`}>
                                      {tier === "flagship" ? "Top" : "Fast"}
                                    </span>
                                  </Show>
                                </button>
                              )
                            }}
                          </For>
                        </div>
                      </div>
                    </Show>

                    {/* Recommended Models */}
                    <Show when={recommendedModels().length > 0}>
                      <div class="picker-section">
                        <div class="picker-section-header">
                          <TrendingUp class="w-4 h-4" />
                          <span>Recommended</span>
                        </div>
                        <div class="picker-model-grid">
                          <For each={recommendedModels()}>
                            {({ model, provider }) => {
                              const isSelected = model.providerId === props.currentModel.providerId && 
                                                model.id === props.currentModel.modelId
                              const tier = getModelTier(model)
                              return (
                                <button
                                  class={`picker-model-card ${isSelected ? "picker-model-card--selected" : ""} picker-model-card--${tier}`}
                                  onClick={() => handleModelSelect(model)}
                                  disabled={isChanging()}
                                  style={{ "--provider-accent": getProviderAccent(provider.id) }}
                                >
                                  <div class="picker-model-card-header">
                                    <span class="picker-model-card-provider">{getProviderIcon(provider.id)}</span>
                                    <Show when={isSelected}>
                                      <Check class="w-3.5 h-3.5 picker-model-inline-check" />
                                    </Show>
                                  </div>
                                  <span class="picker-model-card-name">{model.name}</span>
                                  <Show when={tier !== "standard"}>
                                    <span class={`picker-model-card-tier picker-model-card-tier--${tier}`}>
                                      {tier === "flagship" ? "Top" : "Fast"}
                                    </span>
                                  </Show>
                                </button>
                              )
                            }}
                          </For>
                        </div>
                      </div>
                    </Show>

                    {/* Provider Filter Pills */}
                    <div class="picker-provider-pills picker-provider-pills--section">
                      <button 
                        class={`picker-provider-pill ${!selectedProvider() ? "picker-provider-pill--active" : ""}`}
                        onClick={() => setSelectedProvider(null)}
                      >
                        <Layers class="w-3.5 h-3.5" />
                        All Providers
                      </button>
                      <For each={instanceProviders()}>
                        {(provider) => (
                          <button 
                            class={`picker-provider-pill ${selectedProvider() === provider.id ? "picker-provider-pill--active" : ""}`}
                            onClick={() => setSelectedProvider(prev => prev === provider.id ? null : provider.id)}
                            style={{ "--provider-accent": getProviderAccent(provider.id) }}
                          >
                            <span class="picker-provider-emoji">{getProviderIcon(provider.id)}</span>
                            {provider.name}
                            <span class="picker-provider-count">{provider.models.length}</span>
                          </button>
                        )}
                      </For>
                    </div>

                    {/* Model List by Provider */}
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
                                  const isSelected = model.providerId === props.currentModel.providerId && 
                                                    model.id === props.currentModel.modelId
                                  const tier = getModelTier(model)
                                  return (
                                    <button
                                      class={`picker-model-item ${isSelected ? "picker-model-item--selected" : ""} picker-model-item--${tier}`}
                                      onClick={() => handleModelSelect(model)}
                                      disabled={isChanging()}
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
                                        <Show when={isSelected}>
                                          <div class="picker-model-check">
                                            <Check class="w-3.5 h-3.5" />
                                          </div>
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
              </Show>
            </div>

            {/* Footer with keyboard hints */}
            <div class="picker-footer">
              <div class="picker-footer-hints">
                <span><kbd>↑↓</kbd> Navigate</span>
                <span><kbd>Tab</kbd> Switch tab</span>
                <span><kbd>Enter</kbd> Select</span>
                <span><kbd>Esc</kbd> Close</span>
              </div>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  )
}

export default AgentModelPicker
