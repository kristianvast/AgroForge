import { Component, createSignal, createMemo, Show, For, createEffect } from "solid-js"
import { Dialog } from "@kobalte/core/dialog"
import type { Session, Agent } from "../types/session"
import { getParentSessions, createSession, setActiveParentSession } from "../stores/sessions"
import { instances, stopInstance } from "../stores/instances"
import { agents } from "../stores/sessions"
import { getSessionStatus } from "../stores/session-status"
import { MessageSquare, Search, X, Clock, Plus, Zap } from "lucide-solid"
import { getLogger } from "../lib/logger"
import { cleanSessionTitle } from "../lib/session-title"
const log = getLogger("session")


interface SessionPickerProps {
  instanceId: string
  open: boolean
  onClose: () => void
}

const SessionPicker: Component<SessionPickerProps> = (props) => {
  const [selectedAgent, setSelectedAgent] = createSignal<string>("")
  const [isCreating, setIsCreating] = createSignal(false)
  const [searchQuery, setSearchQuery] = createSignal("")

  const instance = () => instances().get(props.instanceId)
  const parentSessions = () => getParentSessions(props.instanceId)
  const agentList = () => agents().get(props.instanceId) || []

  // Filter sessions based on search query
  const filteredSessions = createMemo(() => {
    const query = searchQuery().toLowerCase().trim()
    if (!query) return parentSessions()
    
    return parentSessions().filter(session => {
      const title = (session.title || "Untitled").toLowerCase()
      return title.includes(query)
    })
  })

  // Reset search when modal closes
  createEffect(() => {
    if (!props.open) {
      setSearchQuery("")
    }
  })

  createEffect(() => {
    const list = agentList()
    if (list.length === 0) {
      setSelectedAgent("")
      return
    }
    const current = selectedAgent()
    if (!current || !list.some((agent) => agent.name === current)) {
      setSelectedAgent(list[0].name)
    }
  })

  function formatRelativeTime(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d`
    if (hours > 0) return `${hours}h`
    if (minutes > 0) return `${minutes}m`
    return "now"
  }

  function getStatusInfo(session: Session) {
    const status = getSessionStatus(props.instanceId, session.id)
    const needsPermission = Boolean(session.pendingPermission)
    const needsQuestion = Boolean((session as any)?.pendingQuestion)
    const needsInput = needsPermission || needsQuestion
    
    return {
      status,
      needsInput,
      statusClass: needsInput ? "session-permission" : `session-${status}`,
      statusText: needsPermission ? "Permission" : needsQuestion ? "Input" : 
                  status === "working" ? "Working" : 
                  status === "compacting" ? "Compacting" : "Idle"
    }
  }

  async function handleSessionSelect(sessionId: string) {
    setActiveParentSession(props.instanceId, sessionId)
    props.onClose()
  }

  async function handleNewSession() {
    setIsCreating(true)
    try {
      const session = await createSession(props.instanceId, selectedAgent())
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

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && handleCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay class="modal-overlay" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content class="session-picker-modal">
            {/* Header */}
            <div class="session-picker-header">
              <div class="session-picker-header-content">
                <div class="session-picker-icon">
                  <MessageSquare class="w-5 h-5" />
                </div>
                <div class="session-picker-title-area">
                  <Dialog.Title class="session-picker-title">
                    Select Session
                  </Dialog.Title>
                  <span class="session-picker-subtitle">
                    {instance()?.folder.split("/").pop()}
                  </span>
                </div>
              </div>
              <button
                type="button"
                class="session-picker-close"
                onClick={handleCancel}
                aria-label="Close"
              >
                <X class="w-4 h-4" />
              </button>
            </div>

            <div class="session-picker-body">
              {/* Resume session section */}
              <div class="session-picker-section">
                <div class="session-picker-section-header">
                  <h3 class="session-picker-section-title">
                    Resume Session
                  </h3>
                  <Show when={parentSessions().length > 0}>
                    <span class="session-count-badge">{parentSessions().length}</span>
                  </Show>
                </div>

                {/* Search input */}
                <Show when={parentSessions().length > 3}>
                  <div class="session-search-input-wrap">
                    <Search class="session-search-input-icon" />
                    <input
                      type="text"
                      class="session-search-input"
                      placeholder="Search sessions..."
                      value={searchQuery()}
                      onInput={(e) => setSearchQuery(e.currentTarget.value)}
                      aria-label="Search sessions"
                    />
                    <Show when={searchQuery()}>
                      <button
                        class="session-search-clear"
                        onClick={() => setSearchQuery("")}
                        aria-label="Clear search"
                      >
                        <X class="w-3.5 h-3.5" />
                      </button>
                    </Show>
                  </div>
                </Show>

                <Show
                  when={parentSessions().length > 0}
                  fallback={
                    <div class="session-empty-state session-empty-state--compact">
                      <div class="session-empty-icon">
                        <MessageSquare class="w-6 h-6" />
                      </div>
                      <p class="session-empty-title">No previous sessions</p>
                      <p class="session-empty-subtitle">Create a new session to get started</p>
                    </div>
                  }
                >
                  <Show
                    when={filteredSessions().length > 0}
                    fallback={
                      <div class="session-empty-state session-empty-state--filtered session-empty-state--compact">
                        <div class="session-empty-icon session-empty-icon--search">
                          <Search class="w-5 h-5" />
                        </div>
                        <p class="session-empty-title">No matching sessions</p>
                        <p class="session-empty-subtitle">No sessions match "{searchQuery()}"</p>
                        <button
                          class="session-empty-action"
                          onClick={() => setSearchQuery("")}
                        >
                          Clear search
                        </button>
                      </div>
                    }
                  >
                    <div class="session-picker-list">
                      <For each={filteredSessions()}>
                        {(session) => {
                          const info = () => getStatusInfo(session)
                          return (
                            <button
                              type="button"
                              class={`session-picker-card ${info().needsInput ? "session-picker-card--attention" : ""} ${info().status === "working" || info().status === "compacting" ? "session-picker-card--working" : ""}`}
                              onClick={() => handleSessionSelect(session.id)}
                            >
                              {/* Left accent bar */}
                              <div class={`session-card-accent session-card-accent--parent ${info().needsInput ? "session-card-accent--attention" : ""} ${info().status === "working" ? "session-card-accent--working" : ""}`} />
                              
                              {/* Icon */}
                              <div class="session-icon session-icon--parent">
                                <MessageSquare class="w-4 h-4" />
                              </div>
                              
                              {/* Content */}
                              <div class="session-picker-card-content">
                                <span class="session-card-title">
                                  {cleanSessionTitle(session.title)}
                                </span>
                                <div class="session-card-meta">
                                  {/* Status pill */}
                                  <span class={`session-status-pill session-status-pill--${info().statusClass}`}>
                                    <Show when={info().needsInput}>
                                      <Zap class="w-3 h-3" />
                                    </Show>
                                    <Show when={info().status === "working" && !info().needsInput}>
                                      <span class="session-status-pulse" />
                                    </Show>
                                    <Show when={info().status === "compacting" && !info().needsInput}>
                                      <span class="session-status-pulse session-status-pulse--slow" />
                                    </Show>
                                    <Show when={info().status === "idle" && !info().needsInput}>
                                      <span class="session-status-dot" />
                                    </Show>
                                    {info().statusText}
                                  </span>
                                  
                                  {/* Time ago */}
                                  <span class="session-time">
                                    <Clock class="w-3 h-3" />
                                    {formatRelativeTime(session.time.updated)}
                                  </span>
                                </div>
                              </div>
                            </button>
                          )
                        }}
                      </For>
                    </div>
                  </Show>
                </Show>
              </div>

              {/* Divider */}
              <div class="session-picker-divider">
                <div class="session-picker-divider-line" />
                <span class="session-picker-divider-text">or</span>
                <div class="session-picker-divider-line" />
              </div>

              {/* New session section */}
              <div class="session-picker-section">
                <h3 class="session-picker-section-title">Start New Session</h3>
                
                <div class="session-picker-new-form">
                  <Show
                    when={agentList().length > 0}
                    fallback={
                      <div class="session-picker-loading">
                        <div class="session-picker-loading-spinner" />
                        <span>Loading agents...</span>
                      </div>
                    }
                  >
                    <Show when={agentList().length > 1}>
                      <select
                        class="session-picker-select"
                        value={selectedAgent()}
                        onChange={(e) => setSelectedAgent(e.currentTarget.value)}
                      >
                        <For each={agentList()}>
                          {(agent) => <option value={agent.name}>{agent.name}</option>}
                        </For>
                      </select>
                    </Show>

                    <button
                      class="session-picker-create-btn"
                      onClick={handleNewSession}
                      disabled={isCreating() || agentList().length === 0}
                    >
                      <Show
                        when={!isCreating()}
                        fallback={
                          <>
                            <div class="session-picker-loading-spinner" />
                            <span>Creating...</span>
                          </>
                        }
                      >
                        <Plus class="w-4 h-4" />
                        <span>Create New Session</span>
                      </Show>
                      <kbd class="session-picker-kbd">⌘↵</kbd>
                    </button>
                  </Show>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div class="session-picker-footer">
              <button
                type="button"
                class="session-picker-cancel-btn"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  )
}

export default SessionPicker
